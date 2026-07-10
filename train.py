"""
train.py
--------
Trains a soil-texture classifier from gamma-ray spectrometry features
(K %, eU ppm, eTh ppm, Cs-137, total count) and engineered ratios.

Model: RandomForest (robust to feature scale, gives feature importances,
handles the class overlap that real gamma-soil data always has).

Outputs (in ./outputs and ./models):
  - models/soil_classifier.joblib   trained pipeline + label list
  - outputs/metrics.txt             accuracy, per-class report, CV score
  - outputs/confusion_matrix.png
  - outputs/feature_importance.png

Run:
  python generate_dataset.py    # writes data/soil_gamma_samples.csv
  python train.py
"""

from __future__ import annotations

import os

import joblib
import matplotlib
matplotlib.use("Agg")  # headless
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    ConfusionMatrixDisplay,
    accuracy_score,
    classification_report,
    confusion_matrix,
)
from sklearn.model_selection import cross_val_score, train_test_split

HERE = os.path.dirname(__file__)
DATA = os.path.join(HERE, "data", "soil_gamma_samples.csv")
MODELS = os.path.join(HERE, "models")
OUT = os.path.join(HERE, "outputs")

RAW_FEATURES = ["K_pct", "U_ppm", "Th_ppm", "Cs137_Bq_kg", "total_count_nGy_h"]


def add_features(df: pd.DataFrame) -> pd.DataFrame:
    """Engineered geophysical ratios used in gamma-ray geology.

    Th/K and U/K discriminate clay mineralogy; sandy quartz soils sit low on
    all absolute channels. Adding the ratios gives the classifier the same
    signals a geophysicist reads off a radiometric ternary plot.
    """
    df = df.copy()
    df["Th_K_ratio"] = df["Th_ppm"] / df["K_pct"].clip(lower=0.05)
    df["U_K_ratio"] = df["U_ppm"] / df["K_pct"].clip(lower=0.05)
    df["Th_U_ratio"] = df["Th_ppm"] / df["U_ppm"].clip(lower=0.10)
    return df


FEATURES = RAW_FEATURES + ["Th_K_ratio", "U_K_ratio", "Th_U_ratio"]


def main() -> None:
    if not os.path.exists(DATA):
        raise SystemExit(
            f"Dataset not found at {DATA}. Run: python generate_dataset.py first."
        )

    df = add_features(pd.read_csv(DATA))
    X = df[FEATURES].values
    y = df["soil_type"].values
    labels = sorted(pd.unique(y).tolist())

    X_tr, X_te, y_tr, y_te = train_test_split(
        X, y, test_size=0.25, random_state=42, stratify=y
    )

    clf = RandomForestClassifier(
        n_estimators=300,
        max_depth=None,
        min_samples_leaf=2,
        random_state=42,
        n_jobs=-1,
    )
    clf.fit(X_tr, y_tr)

    y_pred = clf.predict(X_te)
    acc = accuracy_score(y_te, y_pred)
    report = classification_report(y_te, y_pred, digits=3)
    cv = cross_val_score(clf, X, y, cv=5, scoring="accuracy")

    os.makedirs(MODELS, exist_ok=True)
    os.makedirs(OUT, exist_ok=True)

    joblib.dump({"model": clf, "features": FEATURES, "labels": labels},
                os.path.join(MODELS, "soil_classifier.joblib"))

    metrics_txt = (
        "Soil-texture classifier from gamma-ray spectrometry\n"
        "===================================================\n\n"
        f"Test accuracy : {acc:.3f}\n"
        f"5-fold CV     : {cv.mean():.3f} +/- {cv.std():.3f}\n\n"
        "Per-class report (held-out test set):\n"
        f"{report}\n"
        "Feature importances (higher = more discriminative):\n"
    )
    importances = sorted(
        zip(FEATURES, clf.feature_importances_), key=lambda t: -t[1]
    )
    for name, imp in importances:
        metrics_txt += f"  {name:22s} {imp:.4f}\n"

    with open(os.path.join(OUT, "metrics.txt"), "w") as f:
        f.write(metrics_txt)
    print(metrics_txt)

    # Confusion matrix plot
    cm = confusion_matrix(y_te, y_pred, labels=labels)
    fig, ax = plt.subplots(figsize=(5.5, 5))
    ConfusionMatrixDisplay(cm, display_labels=labels).plot(
        ax=ax, cmap="YlGnBu", colorbar=False, values_format="d"
    )
    ax.set_title("Soil texture — confusion matrix (test set)")
    fig.tight_layout()
    fig.savefig(os.path.join(OUT, "confusion_matrix.png"), dpi=130)
    plt.close(fig)

    # Feature importance plot
    names = [n for n, _ in importances][::-1]
    vals = [v for _, v in importances][::-1]
    fig, ax = plt.subplots(figsize=(6.5, 4.2))
    ax.barh(names, vals, color="#2b8cbe")
    ax.set_xlabel("Importance")
    ax.set_title("Which gamma signals drive soil-type prediction")
    fig.tight_layout()
    fig.savefig(os.path.join(OUT, "feature_importance.png"), dpi=130)
    plt.close(fig)

    print(f"Saved model -> {os.path.join(MODELS, 'soil_classifier.joblib')}")
    print(f"Saved plots -> {OUT}")


if __name__ == "__main__":
    main()
