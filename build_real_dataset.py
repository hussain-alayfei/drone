"""
build_real_dataset.py
---------------------
Joins the real USGS radiometric channels to the real SoilGrids texture labels
and engineers the feature set.

Inputs
  Data/Predictions_{K,eU,eTh}_WesternUS.csv   USGS BMNUS (identical 2 km grid)
  Data/soilgrids_labels.csv                   ISRIC SoilGrids -> USDA triangle

Output
  Data/real_training_set.csv

Feature groups (see README):
  raw          K, U, Th                       the measured channels
  ratios       Th/K, U/K, Th/U                clay-mineralogy discriminators
  dose         total_count                    UNSCEAR, reuses generate_dataset
  uncertainty  K_sd, U_sd, Th_sd              USGS per-point model SD
  anomaly      K_prob, U_prob, Th_prob        USGS P(value > CONUS median)
  spatial      *_nbr (5x5 mean), *_grad       soil varies smoothly in space

The uncertainty / anomaly / spatial groups are new -- the previous synthetic
pipeline used only the 3 raw channels plus ratios, and threw the rest away.

Runs with whatever channels are present: if eU / eTh have not been downloaded
yet it builds a K-only set, which is a legitimate (weaker) lower bound.
"""

from __future__ import annotations

import os

import numpy as np
import pandas as pd

from generate_dataset import _dose_rate_nGy_h

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(os.path.dirname(HERE), "Data")
OUT = os.path.join(DATA, "real_training_set.csv")

SPACING_M = 2000.0

# channel -> (file, value col, sd col, prob col)
SOURCES = {
    "K":  ("Predictions_K_WesternUS.csv",   "Y_mean_per", "Y_sd", "prob"),
    "U":  ("Predictions_eU_WesternUS.csv",  "Y_mean_ppm", "Y_sd", "prob"),
    "Th": ("Predictions_eTh_WesternUS.csv", "Y_mean_ppm", "Y_sd", "prob"),
}


def load_channel(name: str) -> pd.DataFrame | None:
    fname, valcol, sdcol, probcol = SOURCES[name]
    path = os.path.join(DATA, fname)
    if not os.path.exists(path):
        print(f"  -- {fname} not found, skipping {name}")
        return None

    df = pd.read_csv(
        path,
        encoding="utf-8-sig",
        usecols=["FID", "easting", "northing", valcol, sdcol, probcol,
                 "RASTERVALU"],
    )
    df = df[df["RASTERVALU"] == 0].drop(columns="RASTERVALU")
    df = df.rename(columns={
        valcol: name, sdcol: f"{name}_sd", probcol: f"{name}_prob",
    })
    print(f"  {name}: {len(df):,} surveyed points")
    return df


def spatial_features(
    df: pd.DataFrame, channels: list[str],
) -> pd.DataFrame:
    """Neighbourhood mean and local gradient for each channel.

    Soil does not change randomly from one 2 km cell to the next -- a point's
    surroundings genuinely carry information about it. We rasterise each channel
    onto its native grid, take a 5x5 mean and a Sobel-style gradient magnitude,
    then read those back at each point.
    """
    e0, n0 = df["easting"].min(), df["northing"].min()
    col = ((df["easting"] - e0) / SPACING_M).round().astype(int).to_numpy()
    row = ((df["northing"] - n0) / SPACING_M).round().astype(int).to_numpy()
    cols, rows = col.max() + 1, row.max() + 1
    print(f"  native grid {cols} x {rows}")

    for ch in channels:
        vals = df[ch].to_numpy(dtype=np.float64)
        grid = np.full((rows, cols), np.nan)
        grid[row, col] = vals

        # 5x5 nanmean via shifted accumulation (no scipy dependency)
        acc = np.zeros_like(grid)
        cnt = np.zeros_like(grid)
        for dr in range(-2, 3):
            for dc in range(-2, 3):
                sh = np.roll(np.roll(grid, dr, axis=0), dc, axis=1)
                ok = ~np.isnan(sh)
                acc[ok] += sh[ok]
                cnt[ok] += 1
        with np.errstate(invalid="ignore", divide="ignore"):
            nbr = np.where(cnt > 0, acc / np.maximum(cnt, 1), np.nan)

        # central differences on the smoothed field -> gradient magnitude
        gy, gx = np.gradient(np.nan_to_num(nbr, nan=np.nanmean(vals)))
        grad = np.hypot(gx, gy)

        df[f"{ch}_nbr"] = nbr[row, col]
        df[f"{ch}_grad"] = grad[row, col]

    return df


def main() -> None:
    print("loading USGS channels...")
    frames: dict[str, pd.DataFrame] = {}
    for name in SOURCES:
        d = load_channel(name)
        if d is not None:
            frames[name] = d

    if "K" not in frames:
        raise SystemExit("Predictions_K_WesternUS.csv is required.")

    # The three files share one grid, so an inner join on FID is exact.
    df = frames["K"]
    for name, d in frames.items():
        if name == "K":
            continue
        df = df.merge(
            d.drop(columns=["easting", "northing"]), on="FID", how="inner",
        )
    channels = list(frames)
    print(f"\njoined channels {channels}: {len(df):,} points")

    print("\nengineering spatial features...")
    df = spatial_features(df, channels)

    # ---- ratios + dose (only meaningful with all three channels) ----
    have_all = {"K", "U", "Th"} <= set(channels)
    if have_all:
        k = df["K"].clip(lower=0.05)
        u = df["U"].clip(lower=0.10)
        df["Th_K"] = df["Th"] / k
        df["U_K"] = df["U"] / k
        df["Th_U"] = df["Th"] / u
        df["total_count"] = _dose_rate_nGy_h(
            df["K"].to_numpy(), df["U"].to_numpy(), df["Th"].to_numpy(),
        )
        print("  ratios (Th/K, U/K, Th/U) + total_count")
    else:
        missing = {"K", "U", "Th"} - set(channels)
        print(f"  ratios/total_count skipped -- missing {', '.join(sorted(missing))}")

    # ---- attach the real labels ----
    labels = pd.read_csv(os.path.join(DATA, "soilgrids_labels.csv"))
    print(f"\nlabels: {len(labels):,}")

    out = df.merge(
        labels[["FID", "lat", "long", "sand", "silt", "clay",
                "usda_12", "soil_type"]],
        on="FID", how="inner",
    )
    out = out.dropna(subset=["soil_type"])
    print(f"joined to labels: {len(out):,} rows")

    out.to_csv(OUT, index=False)
    print(f"\nwrote {OUT}")
    print(f"\ncolumns ({len(out.columns)}): {', '.join(out.columns)}")
    print("\nclass distribution:")
    vc = out["soil_type"].value_counts()
    for k_, v in vc.items():
        print(f"  {k_:<8} {v:>5}  {100*v/len(out):>5.1f}%")
    print(f"\nmajority-class baseline: {100*vc.iloc[0]/len(out):.1f}%")


if __name__ == "__main__":
    main()
