"""
export_web_model.py
-------------------
Exports a compact version of the REAL soil model for in-browser inference on
the Ain website (web/src/model/).

The browser model is a RandomForest REGRESSOR over clay% and sand%, trained on
Data/real_training_set.csv (USGS radiometrics + SoilGrids labels). The texture
class shown in the UI is derived from the predicted fractions via the USDA
triangle -- same as train_real.py.

It uses only the features a browser can compute from a map cell
(K, U, Th + ratios + UNSCEAR dose), NOT the sd/prob/spatial features of the
full model -- those would require shipping five more grid planes. The honest
spatial-CV numbers for THIS reduced model are embedded in the JSON so the UI
can display exactly what it runs, not the bigger model's numbers.

Outputs (web/src/model/):
  soil_real_rf.json  regression trees (leaf = [clay, sand]) + metrics
  parity_cases.json  30 readings + expected Python predictions (Vitest parity)
  plants.json        unchanged (per-soil recommendations, Arabic)
"""

from __future__ import annotations

import json
import os

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import accuracy_score, mean_absolute_error, r2_score
from sklearn.model_selection import GroupKFold

from fetch_soilgrids_labels import GROUP_12_TO_4, usda_texture
from train_real import blocks, to_class

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(os.path.dirname(HERE), "Data")
CSV = os.path.join(DATA, "real_training_set.csv")
OUT_DIR = os.path.join(HERE, "web", "src", "model")

# Exactly what web/src/model/predict.ts::engineer() produces, in order.
FEATURES = ["K", "U", "Th", "Th_K", "U_K", "Th_U", "total_count"]
TARGETS = ["clay", "sand"]

N_TREES = 40
MAX_DEPTH = 9


def tree_to_dict(tree) -> dict:
    t = tree.tree_
    # Regression leaves: value has shape (nodes, n_outputs, 1) -> [clay, sand]
    value = t.value.reshape(t.node_count, -1)
    return {
        "left": t.children_left.tolist(),
        "right": t.children_right.tolist(),
        "feature": t.feature.tolist(),
        "threshold": t.threshold.tolist(),
        "value": value.tolist(),
    }


def main() -> None:
    if not os.path.exists(CSV):
        raise SystemExit(f"{CSV} not found -- run build_real_dataset.py first.")

    df = pd.read_csv(CSV)
    missing = [f for f in FEATURES if f not in df.columns]
    if missing:
        raise SystemExit(
            f"training set lacks {missing} -- download eU/eTh and re-run "
            "build_real_dataset.py"
        )

    X = df[FEATURES].to_numpy(dtype=float)
    Y = df[TARGETS].to_numpy(dtype=float)
    y_cls = df["soil_type"].to_numpy()
    grp = blocks(df)

    def make_model() -> RandomForestRegressor:
        return RandomForestRegressor(
            n_estimators=N_TREES, max_depth=MAX_DEPTH,
            min_samples_leaf=3, random_state=42, n_jobs=-1,
        )

    # Two honest evaluations of THIS compact browser model:
    # - interpolation (random KFold): predict within the surveyed region --
    #   the drone's actual deployment (survey, calibrate locally, fill in).
    # - extrapolation (spatial blocks): predict a region never seen at all.
    from sklearn.model_selection import KFold

    oof_i = np.zeros_like(Y)
    for tr, te in KFold(n_splits=5, shuffle=True, random_state=42).split(X):
        oof_i[te] = make_model().fit(X[tr], Y[tr]).predict(X[te])

    oof_x = np.zeros_like(Y)
    for tr, te in GroupKFold(n_splits=5).split(X, Y, grp):
        oof_x[te] = make_model().fit(X[tr], Y[tr]).predict(X[te])

    metrics = {
        "interp": {
            "clay_r2": round(float(r2_score(Y[:, 0], oof_i[:, 0])), 3),
            "clay_mae": round(float(mean_absolute_error(Y[:, 0], oof_i[:, 0])), 2),
            "sand_mae": round(float(mean_absolute_error(Y[:, 1], oof_i[:, 1])), 2),
            "class_accuracy": round(
                float(accuracy_score(y_cls, to_class(oof_i[:, 0], oof_i[:, 1]))), 3),
        },
        "extrap": {
            "clay_r2": round(float(r2_score(Y[:, 0], oof_x[:, 0])), 3),
            "clay_mae": round(float(mean_absolute_error(Y[:, 0], oof_x[:, 0])), 2),
            "sand_mae": round(float(mean_absolute_error(Y[:, 1], oof_x[:, 1])), 2),
            "class_accuracy": round(
                float(accuracy_score(y_cls, to_class(oof_x[:, 0], oof_x[:, 1]))), 3),
        },
        "majority_baseline": round(
            float((y_cls == pd.Series(y_cls).mode()[0]).mean()), 3),
        "n_train": int(len(df)),
    }
    print("compact browser model, spatial-CV:")
    for k, v in metrics.items():
        print(f"  {k:<18} {v}")

    final = make_model().fit(X, Y)

    os.makedirs(OUT_DIR, exist_ok=True)
    model_json = {
        "kind": "regression",
        "features": FEATURES,
        "targets": TARGETS,
        "metrics": metrics,
        "source": "USGS NURE/BMNUS radiometrics x ISRIC SoilGrids texture "
                  "(Western US, 4,524 points)",
        "trees": [tree_to_dict(est) for est in final.estimators_],
    }
    path = os.path.join(OUT_DIR, "soil_real_rf.json")
    with open(path, "w", encoding="utf-8") as f:
        json.dump(model_json, f, separators=(",", ":"))
    print(f"\nsoil_real_rf.json: {os.path.getsize(path)/1024:.0f} KB")

    # Parity fixtures: raw channel readings + expected Python outputs,
    # including the derived class so the TS triangle port is locked too.
    rng = np.random.default_rng(7)
    idx = rng.choice(len(df), size=30, replace=False)
    cases = []
    for i in idx:
        row = df.iloc[int(i)]
        pred = final.predict(row[FEATURES].to_numpy(dtype=float).reshape(1, -1))[0]
        clay_p, sand_p = float(pred[0]), float(pred[1])
        silt_p = max(0.0, 100.0 - clay_p - sand_p)
        t12 = usda_texture(sand_p, silt_p, clay_p)
        cases.append({
            "reading": {
                "K": float(row["K"]), "U": float(row["U"]), "Th": float(row["Th"]),
            },
            "expected": {
                "clay": clay_p, "sand": sand_p,
                "soil": GROUP_12_TO_4.get(t12, "Loam"),
            },
        })
    with open(os.path.join(OUT_DIR, "parity_cases.json"), "w",
              encoding="utf-8") as f:
        json.dump(cases, f, indent=1)
    print(f"wrote parity_cases.json (30 cases) -> {OUT_DIR}")


if __name__ == "__main__":
    main()
