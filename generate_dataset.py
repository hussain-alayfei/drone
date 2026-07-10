"""
generate_dataset.py
-------------------
Builds a soil-texture dataset whose gamma-ray features are grounded in
published airborne / mobile gamma-ray spectrometry literature.

WHY SYNTHETIC (for now):
There is no single open CSV that maps a full gamma-ray spectrum
(K, U, Th, total count) to a *labelled soil texture class*
(Sandy / Silty / Clay / Loam). Real airborne surveys (e.g. USGS NURE,
SPH Engineering / Medusa MS-350 test-range exports) publish K %, eU ppm,
eTh ppm and total count, but the texture label has to be joined from a
separate soil map. So this generator reproduces the *documented statistical
signatures* of each texture class, which lets us build and validate the
classifier now, then swap in real survey CSVs later (see README, "Using
real data").

Grounded signatures (natural radionuclide concentrations by texture):
  - Quartz-rich SANDY soils  -> low  K, low  Th, low  U  (few clay minerals)
  - CLAY soils               -> high K, high Th, high U  (clay minerals
                                 adsorb and concentrate K, Th, U)
  - SILT / LOAM              -> intermediate, overlapping ranges
These follow the well-established relationship between gamma radiometric
K-40 / Th-232 and soil sand vs. clay fraction reported across the
gamma-ray-for-soil-mapping literature (IAEA; airborne gamma soil-texture
surrogate studies).

Cs-137 is modelled as an anthropogenic fallout tracer: near-background
almost everywhere, independent of texture. The classifier should therefore
learn that Cs-137 is NOT predictive of texture -- a deliberate honesty check.
"""

from __future__ import annotations

import numpy as np
import pandas as pd

# ----------------------------------------------------------------------------
# Per-class signatures: [mean, std] for K (%), eU (ppm), eTh (ppm).
# Values chosen to match published soil gamma-ray concentration ranges.
# ----------------------------------------------------------------------------
CLASS_STATS = {
    #             K (%)          eU (ppm)        eTh (ppm)
    "Sandy": {"K": (0.60, 0.25), "U": (1.20, 0.50), "Th": (4.0, 1.5)},
    "Silty": {"K": (1.50, 0.35), "U": (2.60, 0.60), "Th": (9.0, 2.0)},
    "Loam":  {"K": (1.80, 0.40), "U": (3.00, 0.70), "Th": (10.5, 2.2)},
    "Clay":  {"K": (2.40, 0.40), "U": (3.80, 0.80), "Th": (14.0, 2.5)},
}

# Within a texture class, K, U and Th co-vary (more clay -> more of all three).
# Shared positive correlation structure applied via a Cholesky factor.
CORR = np.array([
    [1.00, 0.55, 0.70],   # K
    [0.55, 1.00, 0.65],   # U
    [0.70, 0.65, 1.00],   # Th
])

# Physical floors (a reading can never be negative; instruments have a floor).
FLOOR = {"K": 0.05, "U": 0.10, "Th": 0.50}


def _dose_rate_nGy_h(K: np.ndarray, U: np.ndarray, Th: np.ndarray) -> np.ndarray:
    """Absorbed dose rate 1 m above ground (UNSCEAR 2000 conversion coeffs).

    Converts concentrations (K in %, U & Th in ppm) to Bq/kg, then to nGy/h.
    Used as a physically-meaningful proxy for the sensor 'total count'.
        1 % K   ~= 313 Bq/kg  (K-40)
        1 ppm U ~= 12.35 Bq/kg (U-238 series)
        1 ppm Th~= 4.06 Bq/kg  (Th-232 series)
    Dose coefficients: 0.0417 (K-40), 0.462 (U), 0.604 (Th) nGy/h per Bq/kg.
    """
    bq_K = K * 313.0
    bq_U = U * 12.35
    bq_Th = Th * 4.06
    return 0.0417 * bq_K + 0.462 * bq_U + 0.604 * bq_Th


def generate(n_per_class: int = 500, seed: int = 42) -> pd.DataFrame:
    rng = np.random.default_rng(seed)
    chol = np.linalg.cholesky(CORR)

    rows = []
    for label, stats in CLASS_STATS.items():
        means = np.array([stats["K"][0], stats["U"][0], stats["Th"][0]])
        stds = np.array([stats["K"][1], stats["U"][1], stats["Th"][1]])

        # Correlated standard normals -> scale by std -> shift by mean.
        z = rng.standard_normal((n_per_class, 3)) @ chol.T
        vals = means + z * stds

        K = np.maximum(vals[:, 0], FLOOR["K"])
        U = np.maximum(vals[:, 1], FLOOR["U"])
        Th = np.maximum(vals[:, 2], FLOOR["Th"])

        # Total count proxy: dose rate + sensor/altitude noise (~8 %).
        dose = _dose_rate_nGy_h(K, U, Th)
        total_count = dose * (1.0 + rng.normal(0, 0.08, n_per_class))
        total_count = np.maximum(total_count, 1.0)

        # Cs-137 fallout: background ~ a few Bq/kg, occasional hot spots,
        # INDEPENDENT of texture (anthropogenic, not mineralogical).
        cs137 = rng.gamma(shape=1.5, scale=1.2, size=n_per_class)
        hot = rng.random(n_per_class) < 0.05
        cs137[hot] += rng.uniform(5, 20, hot.sum())

        for i in range(n_per_class):
            rows.append({
                "K_pct": round(float(K[i]), 3),
                "U_ppm": round(float(U[i]), 3),
                "Th_ppm": round(float(Th[i]), 3),
                "Cs137_Bq_kg": round(float(cs137[i]), 3),
                "total_count_nGy_h": round(float(total_count[i]), 2),
                "soil_type": label,
            })

    df = pd.DataFrame(rows).sample(frac=1.0, random_state=seed).reset_index(drop=True)
    return df


if __name__ == "__main__":
    import os

    out = os.path.join(os.path.dirname(__file__), "data", "soil_gamma_samples.csv")
    df = generate()
    df.to_csv(out, index=False)
    print(f"Wrote {len(df)} samples -> {out}")
    print("\nClass balance:")
    print(df["soil_type"].value_counts())
    print("\nPer-class means:")
    print(df.groupby("soil_type")[["K_pct", "U_ppm", "Th_ppm", "total_count_nGy_h"]].mean().round(2))
