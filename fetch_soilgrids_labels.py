"""
fetch_soilgrids_labels.py
-------------------------
Harvests REAL soil-texture labels from ISRIC SoilGrids for a stratified sample
of the USGS radiometric grid.

This is the piece that was missing. The USGS files tell us "K = 1.5% at this
coordinate" but never "this point is Clay" -- so supervised training was
impossible. SoilGrids gives measured sand/silt/clay fractions per coordinate;
running them through the USDA texture triangle produces the label.

Only lat/long are needed, so this can run against the K file alone while the
U/Th files are still downloading -- the grid is identical across all three.

Output: Data/soilgrids_labels.csv  (FID, lat, long, sand, silt, clay, usda_12,
soil_type). Resumable: re-running skips FIDs already present.

Usage:
    python fetch_soilgrids_labels.py                # default 5000 points
    python fetch_soilgrids_labels.py --n 8000
"""

from __future__ import annotations

import argparse
import csv
import os
import threading
import time
from concurrent.futures import ThreadPoolExecutor

import numpy as np
import pandas as pd
import requests

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(os.path.dirname(HERE), "Data")
K_CSV = os.path.join(DATA, "Predictions_K_WesternUS.csv")
OUT = os.path.join(DATA, "soilgrids_labels.csv")

API = "https://rest.isric.org/soilgrids/v2.0/properties/query"
DEPTH = "0-5cm"
WORKERS = 5          # polite concurrency; ISRIC is a free public service
TIMEOUT = 30
MAX_RETRY = 3

FIELDS = ["FID", "lat", "long", "sand", "silt", "clay", "usda_12", "soil_type"]


# ---------------------------------------------------------------------------
# USDA texture triangle. Order matters -- these are the standard boundary rules,
# evaluated so that each point falls in exactly one class.
# ---------------------------------------------------------------------------
def usda_texture(sand: float, silt: float, clay: float) -> str:
    if silt + 1.5 * clay < 15:
        return "sand"
    if silt + 1.5 * clay >= 15 and silt + 2 * clay < 30:
        return "loamy sand"
    if (7 <= clay < 20 and sand > 52 and silt + 2 * clay >= 30) or (
        clay < 7 and silt < 50 and silt + 2 * clay >= 30
    ):
        return "sandy loam"
    if 7 <= clay < 27 and 28 <= silt < 50 and sand <= 52:
        return "loam"
    if (silt >= 50 and 12 <= clay < 27) or (50 <= silt < 80 and clay < 12):
        return "silt loam"
    if silt >= 80 and clay < 12:
        return "silt"
    if 20 <= clay < 35 and silt < 28 and sand > 45:
        return "sandy clay loam"
    if 27 <= clay < 40 and 20 < sand <= 45:
        return "clay loam"
    if 27 <= clay < 40 and sand <= 20:
        return "silty clay loam"
    if clay >= 35 and sand > 45:
        return "sandy clay"
    if clay >= 40 and silt >= 40:
        return "silty clay"
    if clay >= 40 and sand <= 45 and silt < 40:
        return "clay"
    return "unknown"


# The site, plants.json and the trained classifier all speak these 4 classes.
#
# Grouping is by CLAY CONTENT, because that is the thing gamma spectrometry
# actually senses: K, U and Th adsorb onto clay minerals, so the radiometric
# signal tracks the clay fraction.
#
# This is why `clay loam` and `silty clay loam` sit under Clay and not Loam:
# both carry 27-40% clay. Filing them under Loam (7-27% clay) lumped genuinely
# clay-rich soils in with moderate ones, which is wrong on the physics -- and it
# also collapsed the Western US sample into ~71% Loam with only 33 Clay points,
# leaving Clay unlearnable. The corrected grouping gives ~55/20/17/8.
GROUP_12_TO_4 = {
    # low clay (<20%)
    "sand": "Sandy", "loamy sand": "Sandy", "sandy loam": "Sandy",
    # silt-dominated
    "silt": "Silty", "silt loam": "Silty",
    # moderate clay (7-27%)
    "loam": "Loam", "sandy clay loam": "Loam",
    # high clay (27%+)
    "clay loam": "Clay", "silty clay loam": "Clay",
    "clay": "Clay", "sandy clay": "Clay", "silty clay": "Clay",
}


def stratified_sample(n: int, seed: int = 42) -> pd.DataFrame:
    """Sample the USGS grid across the K range AND across geography.

    Sampling on K alone would over-weight whatever regions happen to be
    radiometrically extreme; sampling on geography alone would under-sample the
    tails of K. Crossing the two keeps both the feature range and the map
    covered, which matters because we later split on geography.
    """
    print(f"reading {os.path.basename(K_CSV)} ...")
    df = pd.read_csv(
        K_CSV,
        encoding="utf-8-sig",
        usecols=["FID", "long", "lat", "Y_mean_per", "RASTERVALU"],
    )
    before = len(df)
    df = df[df["RASTERVALU"] == 0]          # drop unsurveyed; USGS masks these out
    print(f"  {before:,} rows -> {len(df):,} surveyed")

    rng = np.random.default_rng(seed)
    # 5 K-quantile bands x 5x5 spatial cells = 125 strata, sampled evenly.
    df = df.assign(
        k_band=pd.qcut(df["Y_mean_per"], 5, labels=False, duplicates="drop"),
        lat_band=pd.cut(df["lat"], 5, labels=False),
        lon_band=pd.cut(df["long"], 5, labels=False),
    )
    strata = df.groupby(["k_band", "lat_band", "lon_band"], observed=True)
    per = max(1, n // max(1, strata.ngroups))

    picked = strata.apply(
        lambda g: g.sample(min(len(g), per), random_state=seed),
        include_groups=False,
    ).reset_index(drop=True)

    # Top up to n if some strata were thin (edges of the survey area).
    if len(picked) < n:
        rest = df.loc[~df["FID"].isin(picked["FID"])]
        extra = rest.sample(min(len(rest), n - len(picked)), random_state=seed)
        picked = pd.concat([picked, extra], ignore_index=True)

    picked = picked.sample(frac=1.0, random_state=seed).head(n)
    print(f"  sampled {len(picked):,} points across {strata.ngroups} strata")
    return picked[["FID", "lat", "long"]].reset_index(drop=True)


def query_point(lat: float, lon: float) -> tuple[float, float, float] | None:
    """One SoilGrids point query -> (sand, silt, clay) in percent, or None."""
    params = [("lon", lon), ("lat", lat), ("depth", DEPTH), ("value", "mean")]
    params += [("property", p) for p in ("sand", "silt", "clay")]

    for attempt in range(MAX_RETRY):
        try:
            r = requests.get(API, params=params, timeout=TIMEOUT)
            if r.status_code == 429:                     # rate limited -- back off
                time.sleep(2 ** attempt + 1)
                continue
            r.raise_for_status()
            layers = r.json()["properties"]["layers"]
            vals = {
                L["name"]: L["depths"][0]["values"]["mean"] for L in layers
            }
            if any(vals.get(k) is None for k in ("sand", "silt", "clay")):
                return None                              # ocean / no-data
            # SoilGrids ships g/kg; /10 -> percent.
            return (vals["sand"] / 10, vals["silt"] / 10, vals["clay"] / 10)
        except requests.RequestException:
            if attempt == MAX_RETRY - 1:
                return None
            time.sleep(2 ** attempt)
    return None


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--n", type=int, default=5000, help="points to label")
    args = ap.parse_args()

    pts = stratified_sample(args.n)

    # Resume: skip FIDs we already have.
    done: set[int] = set()
    if os.path.exists(OUT):
        prev = pd.read_csv(OUT)
        done = set(prev["FID"].tolist())
        print(f"resuming -- {len(done):,} already labelled")

    todo = pts[~pts["FID"].isin(done)]
    if todo.empty:
        print("nothing to do.")
        return
    print(f"querying SoilGrids for {len(todo):,} points ({WORKERS} workers)...\n")

    lock = threading.Lock()
    new_file = not os.path.exists(OUT)
    f = open(OUT, "a", newline="", encoding="utf-8")
    w = csv.DictWriter(f, fieldnames=FIELDS)
    if new_file:
        w.writeheader()

    counter = {"ok": 0, "null": 0, "n": 0}
    t0 = time.time()

    def work(row) -> None:
        res = query_point(row.lat, row.long)
        with lock:
            counter["n"] += 1
            if res is None:
                counter["null"] += 1
            else:
                sand, silt, clay = res
                t12 = usda_texture(sand, silt, clay)
                w.writerow({
                    "FID": int(row.FID),
                    "lat": row.lat,
                    "long": row.long,
                    "sand": round(sand, 2),
                    "silt": round(silt, 2),
                    "clay": round(clay, 2),
                    "usda_12": t12,
                    "soil_type": GROUP_12_TO_4.get(t12, "unknown"),
                })
                counter["ok"] += 1
            if counter["n"] % 100 == 0:
                el = time.time() - t0
                rate = counter["n"] / el
                left = (len(todo) - counter["n"]) / rate if rate else 0
                print(f"  {counter['n']:>5,}/{len(todo):,}  "
                      f"ok={counter['ok']:,} null={counter['null']:,}  "
                      f"{rate:.1f}/s  eta {left/60:.1f}m", flush=True)
                f.flush()

    with ThreadPoolExecutor(max_workers=WORKERS) as ex:
        list(ex.map(work, [r for r in todo.itertuples(index=False)]))

    f.close()
    print(f"\ndone in {(time.time()-t0)/60:.1f} min -> {OUT}")

    lab = pd.read_csv(OUT)
    print(f"\ntotal labelled: {len(lab):,}")
    print("\n4-class distribution:")
    print(lab["soil_type"].value_counts())
    print("\nUSDA 12-class distribution:")
    print(lab["usda_12"].value_counts())


if __name__ == "__main__":
    main()
