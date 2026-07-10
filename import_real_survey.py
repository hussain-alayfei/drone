"""
import_real_survey.py
---------------------
Adapter that turns a REAL airborne / drone gamma-ray survey export
(USGS NURE flight-line CSV, SPH Engineering / Medusa MS-350 export, etc.)
into the column layout this project's train.py expects.

Real surveys publish the radionuclide channels under many different names.
This maps the common ones to our schema:
    K_pct, U_ppm, Th_ppm, Cs137_Bq_kg, total_count_nGy_h, soil_type

Usage:
    python import_real_survey.py --in survey.csv --out data/soil_gamma_samples.csv \
        --k-col K --u-col U --th-col Th --tc-col TC --label-col texture

The soil_type / label column must already contain the texture class
(Sandy / Silty / Loam / Clay) for supervised training. In a real pipeline
that label comes from joining the survey points to a soil-texture map
(e.g. SoilGrids, gNATSGO) or from ground-truth lab samples.
"""

from __future__ import annotations

import argparse

import pandas as pd

# Common aliases seen in real exports -> our canonical names.
ALIASES = {
    "K_pct": ["K", "K_pct", "k_perc", "potassium", "K40", "K_%", "pctK", "eK"],
    "U_ppm": ["U", "U_ppm", "eU", "uranium", "eU_ppm", "ppmU"],
    "Th_ppm": ["Th", "Th_ppm", "eTh", "thorium", "eTh_ppm", "ppmTh"],
    "Cs137_Bq_kg": ["Cs", "Cs137", "cs137", "Cs-137", "cesium"],
    "total_count_nGy_h": ["TC", "total_count", "totalcount", "TotalCount",
                          "dose", "dose_rate", "nGy_h", "TC_uR_h"],
    "soil_type": ["soil_type", "texture", "class", "label", "soil_class"],
}


def _find(colname_options, columns):
    lower = {c.lower(): c for c in columns}
    for opt in colname_options:
        if opt.lower() in lower:
            return lower[opt.lower()]
    return None


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--in", dest="inp", required=True, help="raw survey CSV")
    p.add_argument("--out", default="data/soil_gamma_samples.csv")
    # optional explicit overrides
    for key in ["k", "u", "th", "cs", "tc", "label"]:
        p.add_argument(f"--{key}-col", default=None)
    args = p.parse_args()

    df = pd.read_csv(args.inp)
    cols = list(df.columns)

    overrides = {
        "K_pct": args.k_col, "U_ppm": args.u_col, "Th_ppm": args.th_col,
        "Cs137_Bq_kg": args.cs_col, "total_count_nGy_h": args.tc_col,
        "soil_type": args.label_col,
    }

    out = pd.DataFrame()
    for canon, aliases in ALIASES.items():
        src = overrides[canon] or _find(aliases, cols)
        if src is not None and src in df.columns:
            out[canon] = df[src]
        elif canon == "Cs137_Bq_kg":
            out[canon] = 2.0  # background default if survey lacks Cs channel
        else:
            print(f"WARNING: could not find a column for '{canon}'. "
                  f"Pass --{canon.split('_')[0].lower()}-col explicitly.")

    # total_count is derived if missing (see generate_dataset._dose_rate_nGy_h)
    if "total_count_nGy_h" not in out.columns and {"K_pct", "U_ppm", "Th_ppm"} <= set(out.columns):
        from generate_dataset import _dose_rate_nGy_h
        out["total_count_nGy_h"] = _dose_rate_nGy_h(
            out["K_pct"].values, out["U_ppm"].values, out["Th_ppm"].values)

    out.to_csv(args.out, index=False)
    print(f"Wrote {len(out)} rows -> {args.out}")
    print("Now run: python train.py")


if __name__ == "__main__":
    main()
