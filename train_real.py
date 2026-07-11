"""
train_real.py
-------------
Trains on the REAL data (USGS radiometrics -> SoilGrids texture) and reports
honestly. Does not replace train.py; the synthetic path stays for comparison.

Two things make this different from train.py, and both make the number LOWER
and more trustworthy:

1. REGRESSION IS THE PRIMARY TARGET.
   Gamma spectrometry senses clay-mineral content, so what it can actually
   predict is the clay/sand FRACTION -- which is what the published literature
   predicts too. Hard texture classes impose arbitrary boundaries on a
   continuous quantity. We regress clay% and sand%, then derive the texture
   class from the predicted fractions via the same USDA triangle used to build
   the labels. The site still gets a class + plant recommendation, but the
   model is doing the thing it can honestly do.

2. SPATIAL BLOCK CROSS-VALIDATION.
   The points sit on a 2 km grid. A random split puts a point in train and its
   neighbour in test, which leaks and inflates accuracy -- the classic
   geospatial ML mistake. We split into geographic blocks so test blocks are
   spatially disjoint from training ones. We ALSO report the naive random-split
   number, purely to show how much it overstates things.

Outputs:
  models/soil_real.joblib
  outputs/real_metrics.txt
  outputs/real_confusion.png
  outputs/real_importance.png
"""

from __future__ import annotations

import os

import joblib
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from sklearn.dummy import DummyClassifier
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import (
    ConfusionMatrixDisplay,
    accuracy_score,
    classification_report,
    confusion_matrix,
    mean_absolute_error,
    r2_score,
)
from sklearn.model_selection import GroupKFold, KFold

from fetch_soilgrids_labels import GROUP_12_TO_4, usda_texture

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(os.path.dirname(HERE), "Data")
CSV = os.path.join(DATA, "real_training_set.csv")
MODELS = os.path.join(HERE, "models")
OUT = os.path.join(HERE, "outputs")

TARGETS = ["clay", "sand"]      # silt = 100 - clay - sand
N_BLOCKS = 6                    # 6x6 geographic blocks
N_FOLDS = 5
LABELS = ["Sandy", "Silty", "Loam", "Clay"]


def feature_columns(df: pd.DataFrame) -> list[str]:
    """Every engineered feature present, in a stable order.

    Deliberately excludes lat/long: with enough trees a forest will happily
    memorise geography and 'predict' texture from position alone, which tells us
    nothing about whether gamma carries the signal.
    """
    groups = [
        ["K", "U", "Th"],                          # raw channels
        ["Th_K", "U_K", "Th_U"],                   # mineralogy ratios
        ["total_count"],                           # UNSCEAR dose
        ["K_sd", "U_sd", "Th_sd"],                 # USGS uncertainty
        ["K_prob", "U_prob", "Th_prob"],           # USGS anomaly vs CONUS median
        ["K_nbr", "U_nbr", "Th_nbr"],              # 5x5 neighbourhood mean
        ["K_grad", "U_grad", "Th_grad"],           # local gradient
    ]
    return [c for g in groups for c in g if c in df.columns]


def blocks(df: pd.DataFrame, n: int = N_BLOCKS) -> np.ndarray:
    """Geographic block id per point -- the CV group."""
    bx = pd.cut(df["easting"], n, labels=False)
    by = pd.cut(df["northing"], n, labels=False)
    return (by * n + bx).to_numpy()


def to_class(clay: np.ndarray, sand: np.ndarray) -> np.ndarray:
    """Predicted fractions -> USDA triangle -> the site's 4 classes."""
    clay = np.clip(clay, 0, 100)
    sand = np.clip(sand, 0, 100)
    silt = np.clip(100 - clay - sand, 0, 100)
    return np.array([
        GROUP_12_TO_4.get(usda_texture(sa, si, cl), "Loam")
        for sa, si, cl in zip(sand, silt, clay)
    ])


def cv_predict(X, Y, groups, splitter) -> np.ndarray:
    """Out-of-fold predictions under the given splitter."""
    oof = np.zeros_like(Y, dtype=float)
    for tr, te in splitter:
        m = RandomForestRegressor(
            n_estimators=300, min_samples_leaf=3,
            random_state=42, n_jobs=-1,
        )
        m.fit(X[tr], Y[tr])
        oof[te] = m.predict(X[te])
    return oof


def main() -> None:
    if not os.path.exists(CSV):
        raise SystemExit(f"{CSV} not found -- run build_real_dataset.py first.")

    df = pd.read_csv(CSV)
    feats = feature_columns(df)
    have_all = {"K", "U", "Th"} <= set(df.columns)

    X = df[feats].to_numpy(dtype=float)
    Y = df[TARGETS].to_numpy(dtype=float)
    y_true = df["soil_type"].to_numpy()
    grp = blocks(df)

    lines: list[str] = []
    def say(s: str = "") -> None:
        print(s)
        lines.append(s)

    say("Soil texture from real gamma-ray spectrometry")
    say("=" * 62)
    say()
    say(f"data     : {len(df):,} points, Western US")
    say(f"radiometrics : USGS NURE / BMNUS airborne survey")
    say(f"labels       : ISRIC SoilGrids -> USDA texture triangle")
    say(f"features ({len(feats)}): {', '.join(feats)}")
    if not have_all:
        missing = {"K", "U", "Th"} - set(df.columns)
        say()
        say(f"!! K-ONLY RUN -- missing {', '.join(sorted(missing))}.")
        say("   This is a LOWER BOUND. Download the eU/eTh files and re-run")
        say("   to give the model the channels it was designed for.")
    say()

    # ---------------- baselines ----------------
    maj = DummyClassifier(strategy="most_frequent").fit(X, y_true)
    base_acc = accuracy_score(y_true, maj.predict(X))
    say(f"majority-class baseline : {base_acc:.3f}  (always guess "
        f"{pd.Series(y_true).mode()[0]})")
    say("  Any honest result must beat this. It is the number to argue with.")
    say()

    # ---------------- spatial block CV (the honest one) ----------------
    gkf = GroupKFold(n_splits=N_FOLDS)
    oof_spatial = cv_predict(X, Y, grp, gkf.split(X, Y, grp))

    say("SPATIAL BLOCK CV  (test blocks geographically disjoint from train)")
    say("-" * 62)
    for i, t in enumerate(TARGETS):
        r2 = r2_score(Y[:, i], oof_spatial[:, i])
        mae = mean_absolute_error(Y[:, i], oof_spatial[:, i])
        say(f"  {t:<5} R2 = {r2:6.3f}   MAE = {mae:5.2f} percentage points")

    cls_spatial = to_class(oof_spatial[:, 0], oof_spatial[:, 1])
    acc_spatial = accuracy_score(y_true, cls_spatial)
    say()
    say(f"  derived texture-class accuracy : {acc_spatial:.3f}")
    say(f"  vs majority baseline            : {base_acc:.3f}  "
        f"({acc_spatial - base_acc:+.3f})")
    say()
    say(classification_report(y_true, cls_spatial, labels=LABELS,
                              digits=3, zero_division=0))

    # ---------------- naive random CV (to expose the leak) -------------
    kf = KFold(n_splits=N_FOLDS, shuffle=True, random_state=42)
    oof_random = cv_predict(X, Y, grp, kf.split(X))
    cls_random = to_class(oof_random[:, 0], oof_random[:, 1])
    acc_random = accuracy_score(y_true, cls_random)
    r2_random = r2_score(Y[:, 0], oof_random[:, 0])
    r2_spatial = r2_score(Y[:, 0], oof_spatial[:, 0])

    say("RANDOM-SPLIT CV  (reported only to show what it overstates)")
    say("-" * 62)
    say(f"  clay R2  random {r2_random:6.3f}   vs spatial {r2_spatial:6.3f}")
    say(f"  accuracy random {acc_random:6.3f}   vs spatial {acc_spatial:6.3f}")
    gap = acc_random - acc_spatial
    say()
    if gap > 0.02:
        say(f"  The random split is {gap:+.3f} optimistic. That gap IS the spatial")
        say("  leak: neighbouring 2 km points landing on both sides of the split.")
        say("  The spatial number is the one to quote.")
    else:
        say("  Little gap -- either weak spatial autocorrelation, or the blocks")
        say("  are too small to separate. Worth checking before trusting either.")
    say()

    # ---------------- fit final model on everything ----------------
    final = RandomForestRegressor(
        n_estimators=300, min_samples_leaf=3, random_state=42, n_jobs=-1,
    ).fit(X, Y)

    imp = sorted(zip(feats, final.feature_importances_), key=lambda t: -t[1])
    say("FEATURE IMPORTANCE")
    say("-" * 62)
    for name, v in imp:
        say(f"  {name:<14} {v:.4f}  {'#' * int(round(v * 90))}")
    say()

    os.makedirs(MODELS, exist_ok=True)
    os.makedirs(OUT, exist_ok=True)
    joblib.dump(
        {"model": final, "features": feats, "targets": TARGETS},
        os.path.join(MODELS, "soil_real.joblib"),
    )

    with open(os.path.join(OUT, "real_metrics.txt"), "w", encoding="utf-8") as f:
        f.write("\n".join(lines))

    cm = confusion_matrix(y_true, cls_spatial, labels=LABELS)
    fig, ax = plt.subplots(figsize=(5.6, 5))
    ConfusionMatrixDisplay(cm, display_labels=LABELS).plot(
        ax=ax, cmap="YlGnBu", colorbar=False, values_format="d",
    )
    ax.set_title("Real data — spatial block CV")
    fig.tight_layout()
    fig.savefig(os.path.join(OUT, "real_confusion.png"), dpi=130)
    plt.close(fig)

    names = [n for n, _ in imp][::-1]
    vals = [v for _, v in imp][::-1]
    fig, ax = plt.subplots(figsize=(6.5, max(3.2, 0.32 * len(names))))
    ax.barh(names, vals, color="#5c5f3a")
    ax.set_xlabel("importance")
    ax.set_title("What the model actually leans on (real data)")
    fig.tight_layout()
    fig.savefig(os.path.join(OUT, "real_importance.png"), dpi=130)
    plt.close(fig)

    print(f"\nwrote {OUT}/real_metrics.txt + plots, models/soil_real.joblib")


if __name__ == "__main__":
    main()
