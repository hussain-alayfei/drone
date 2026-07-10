"""
predict.py
----------
Predict soil texture from a single gamma-ray reading and recommend plants.

Example (a low-radionuclide, quartz-rich reading -> Sandy):
  python predict.py --K 0.5 --U 1.0 --Th 3.5

Full reading:
  python predict.py --K 2.3 --U 3.9 --Th 14.2 --Cs137 2.1 --total_count 260

If --total_count is omitted it is estimated from K/U/Th via the UNSCEAR dose
model (same one used to generate the training feature), so real drone exports
that only carry the three channels still work.
"""

from __future__ import annotations

import argparse
import os

import joblib
import numpy as np
import pandas as pd

from generate_dataset import _dose_rate_nGy_h
from plant_recommendations import format_recommendation
from train import add_features

HERE = os.path.dirname(__file__)
MODEL_PATH = os.path.join(HERE, "models", "soil_classifier.joblib")


def load_model():
    if not os.path.exists(MODEL_PATH):
        raise SystemExit("Model not found. Run: python train.py first.")
    return joblib.load(MODEL_PATH)


def predict_one(K, U, Th, Cs137=2.0, total_count=None):
    bundle = load_model()
    model, features = bundle["model"], bundle["features"]

    if total_count is None:
        total_count = float(_dose_rate_nGy_h(
            np.array([K]), np.array([U]), np.array([Th]))[0])

    row = pd.DataFrame([{
        "K_pct": K, "U_ppm": U, "Th_ppm": Th,
        "Cs137_Bq_kg": Cs137, "total_count_nGy_h": total_count,
    }])
    row = add_features(row)
    X = row[features].values

    pred = model.predict(X)[0]
    proba = dict(zip(model.classes_, model.predict_proba(X)[0]))
    return pred, proba, total_count


def main() -> None:
    p = argparse.ArgumentParser(description="Gamma-ray -> soil texture -> plants")
    p.add_argument("--K", type=float, required=True, help="Potassium %%")
    p.add_argument("--U", type=float, required=True, help="equivalent Uranium ppm")
    p.add_argument("--Th", type=float, required=True, help="equivalent Thorium ppm")
    p.add_argument("--Cs137", type=float, default=2.0, help="Cs-137 Bq/kg (optional)")
    p.add_argument("--total_count", type=float, default=None,
                   help="total count / dose nGy/h (optional, auto-estimated)")
    args = p.parse_args()

    pred, proba, tc = predict_one(
        args.K, args.U, args.Th, args.Cs137, args.total_count)

    print("=" * 52)
    print("  Gamma-ray reading")
    print(f"    K   = {args.K} %    U = {args.U} ppm    Th = {args.Th} ppm")
    print(f"    Cs-137 = {args.Cs137} Bq/kg    total count = {tc:.1f} nGy/h")
    print(f"    Th/K ratio = {args.Th / max(args.K, 0.05):.2f}")
    print("-" * 52)
    print(f"  PREDICTED SOIL TYPE:  {pred}")
    print("  confidence:")
    for cls, pr in sorted(proba.items(), key=lambda t: -t[1]):
        bar = "#" * int(round(pr * 20))
        print(f"    {cls:6s} {pr*100:5.1f}%  {bar}")
    print("-" * 52)
    print(format_recommendation(pred))
    print("=" * 52)


if __name__ == "__main__":
    main()
