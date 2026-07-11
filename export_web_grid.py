"""
export_web_grid.py
------------------
Downsamples the real USGS radiometric grid into a heightfield the browser can
hold, and writes it to web/public/ as a tiny header + a Uint16 binary.

The native survey is ~727 x 1084 cells at 2 km spacing (563,056 points). That
is far too much geometry for a web canvas, so we bin it. Every exported cell is
the MEAN of the real measured points inside it -- never interpolated or
invented. Clicking a cell in the demo therefore returns a real reading.

Channels: K (%), U (ppm), Th (ppm), TC (nGy/h, derived via UNSCEAR).
If the eU / eTh files are not present yet, whatever exists is exported and the
header records which channels are real -- so the map still renders while the
rest downloads.

Outputs (web/public/):
  us-grid.json   dims, geographic bounds, per-channel min/max, channel list
  us-grid.bin    Uint16 per channel, row-major, concatenated in header order

Decode in JS:  value = min + (u16 / 65534) * (max - min);  u16 == 65535 => nodata

Usage:
    python export_web_grid.py [--factor 6]
"""

from __future__ import annotations

import argparse
import json
import os

import numpy as np
import pandas as pd

from generate_dataset import _dose_rate_nGy_h

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(os.path.dirname(HERE), "Data")
OUT_DIR = os.path.join(HERE, "web", "public")

NODATA = 65535
SPACING_M = 2000.0  # native USGS grid spacing

# channel -> (filename, value column)
SOURCES = {
    "K":  ("Predictions_K_WesternUS.csv",   "Y_mean_per"),
    "U":  ("Predictions_eU_WesternUS.csv",  "Y_mean_ppm"),
    "Th": ("Predictions_eTh_WesternUS.csv", "Y_mean_ppm"),
}


def load_channel(fname: str, valcol: str) -> pd.DataFrame | None:
    path = os.path.join(DATA, fname)
    if not os.path.exists(path):
        print(f"  -- {fname} not found, skipping")
        return None
    df = pd.read_csv(
        path,
        encoding="utf-8-sig",
        usecols=["FID", "long", "lat", "easting", "northing", valcol, "RASTERVALU"],
    )
    df = df[df["RASTERVALU"] == 0]  # unsurveyed points are masked out by USGS too
    print(f"  {fname}: {len(df):,} surveyed points")
    return df.rename(columns={valcol: "value"})


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--factor", type=int, default=6,
                    help="downsample factor (6 -> ~121x181 cells)")
    args = ap.parse_args()

    print("loading channels...")
    chans: dict[str, pd.DataFrame] = {}
    for name, (fname, valcol) in SOURCES.items():
        df = load_channel(fname, valcol)
        if df is not None:
            chans[name] = df

    if "K" not in chans:
        raise SystemExit("Predictions_K_WesternUS.csv is required.")

    # The three files share one grid (identical FID/easting/northing), so the K
    # file alone defines the cell layout.
    base = chans["K"]
    e0, e1 = base["easting"].min(), base["easting"].max()
    n0, n1 = base["northing"].min(), base["northing"].max()
    step = SPACING_M * args.factor

    cols = int(np.ceil((e1 - e0) / step)) + 1
    rows = int(np.ceil((n1 - n0) / step)) + 1
    print(f"\ngrid: {cols} x {rows} = {cols*rows:,} cells "
          f"(factor {args.factor}, {step/1000:.0f} km cells)")

    def bin_index(df: pd.DataFrame) -> tuple[np.ndarray, np.ndarray]:
        cx = ((df["easting"].to_numpy() - e0) / step).astype(np.int32)
        cy = ((df["northing"].to_numpy() - n0) / step).astype(np.int32)
        return np.clip(cx, 0, cols - 1), np.clip(cy, 0, rows - 1)

    # Mean of the real points falling in each cell.
    grids: dict[str, np.ndarray] = {}
    for name, df in chans.items():
        cx, cy = bin_index(df)
        flat = cy * cols + cx
        total = np.bincount(flat, weights=df["value"].to_numpy(),
                            minlength=rows * cols)
        count = np.bincount(flat, minlength=rows * cols)
        with np.errstate(invalid="ignore", divide="ignore"):
            mean = np.where(count > 0, total / np.maximum(count, 1), np.nan)
        grids[name] = mean.astype(np.float64)
        filled = int((count > 0).sum())
        print(f"  {name}: {filled:,}/{rows*cols:,} cells filled "
              f"({100*filled/(rows*cols):.0f}%)")

    # Total count needs all three channels.
    if {"K", "U", "Th"} <= grids.keys():
        grids["TC"] = _dose_rate_nGy_h(grids["K"], grids["U"], grids["Th"])
        print("  TC: derived from K/U/Th (UNSCEAR)")
    else:
        missing = {"K", "U", "Th"} - grids.keys()
        print(f"  TC: skipped -- missing {', '.join(sorted(missing))}")

    # Also carry lat/long per cell so a clicked cell can report where it is.
    cx, cy = bin_index(base)
    flat = cy * cols + cx
    cnt = np.bincount(flat, minlength=rows * cols)
    lat = np.bincount(flat, weights=base["lat"].to_numpy(), minlength=rows * cols)
    lon = np.bincount(flat, weights=base["long"].to_numpy(), minlength=rows * cols)
    with np.errstate(invalid="ignore", divide="ignore"):
        lat = np.where(cnt > 0, lat / np.maximum(cnt, 1), np.nan)
        lon = np.where(cnt > 0, lon / np.maximum(cnt, 1), np.nan)

    os.makedirs(OUT_DIR, exist_ok=True)

    order = [c for c in ("K", "U", "Th", "TC") if c in grids]
    header = {
        "cols": cols,
        "rows": rows,
        "nodata": NODATA,
        "cellKm": step / 1000,
        "bounds": {
            "lat0": float(np.nanmin(lat)), "lat1": float(np.nanmax(lat)),
            "lon0": float(np.nanmin(lon)), "lon1": float(np.nanmax(lon)),
        },
        "channels": order,
        "range": {},
        "source": "USGS NURE / BMNUS airborne radiometric survey (Western US)",
    }

    buf = bytearray()
    for name in order:
        g = grids[name]
        lo, hi = float(np.nanmin(g)), float(np.nanmax(g))
        header["range"][name] = {"min": lo, "max": hi}
        span = (hi - lo) or 1.0
        q = np.full(g.shape, NODATA, dtype=np.uint16)
        ok = ~np.isnan(g)
        q[ok] = np.round((g[ok] - lo) / span * 65534).astype(np.uint16)
        buf += q.tobytes()
        print(f"  packed {name}: {lo:.3f} .. {hi:.3f}")

    # lat/long as two more Uint16 planes (same decode, own ranges)
    for name, arr in (("lat", lat), ("lon", lon)):
        lo, hi = float(np.nanmin(arr)), float(np.nanmax(arr))
        header["range"][name] = {"min": lo, "max": hi}
        span = (hi - lo) or 1.0
        q = np.full(arr.shape, NODATA, dtype=np.uint16)
        ok = ~np.isnan(arr)
        q[ok] = np.round((arr[ok] - lo) / span * 65534).astype(np.uint16)
        buf += q.tobytes()
    header["planes"] = order + ["lat", "lon"]

    with open(os.path.join(OUT_DIR, "us-grid.json"), "w", encoding="utf-8") as f:
        json.dump(header, f, indent=1)
    with open(os.path.join(OUT_DIR, "us-grid.bin"), "wb") as f:
        f.write(buf)

    # Fixtures so the browser's Uint16 decode can be checked against the values
    # we actually packed here (web/src/data/grid.test.ts). A silent decode bug
    # would make the map show wrong numbers while claiming they are measured.
    rng = np.random.default_rng(11)
    cases = []
    for name in order:
        g = grids[name]
        filled = np.flatnonzero(~np.isnan(g))
        holes = np.flatnonzero(np.isnan(g))
        pick = rng.choice(filled, size=min(12, len(filled)), replace=False)
        if len(holes):
            pick = np.concatenate([pick, rng.choice(holes, size=2, replace=False)])
        for i in pick:
            v = g[int(i)]
            cases.append({
                "channel": name,
                "col": int(i % cols),
                "row": int(i // cols),
                "expected": None if np.isnan(v) else float(v),
            })
    fixtures = os.path.join(HERE, "web", "src", "data", "grid_cases.json")
    with open(fixtures, "w", encoding="utf-8") as f:
        json.dump(cases, f, indent=1)
    print(f"  wrote {len(cases)} decode fixtures -> grid_cases.json")

    kb = len(buf) / 1024
    print(f"\nwrote us-grid.json + us-grid.bin ({kb:.0f} KB raw, "
          f"{len(header['planes'])} planes) -> {OUT_DIR}")
    if "TC" not in grids:
        print("\nNOTE: re-run after downloading the eU / eTh files to enable "
              "all channels and in-browser prediction.")


if __name__ == "__main__":
    main()
