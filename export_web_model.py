"""
export_web_model.py
-------------------
Exports a compact version of the soil classifier for in-browser inference
on the Ain website (web/src/model/).

Why a separate compact model: the full 300-tree forest in models/ is ~12 MB;
a 40-tree depth-8 forest keeps near-identical accuracy at a JSON size a
browser can load instantly. Thresholds are exported at full float precision
so the JS tree-walk reproduces sklearn's predict_proba bit-for-bit; the
parity_cases.json fixtures lock that in via a Vitest test.

Outputs (web/src/model/):
  soil_rf.json      trees (children/feature/threshold/leaf probabilities)
  plants.json       per-soil plant recommendations + notes (Arabic)
  parity_cases.json 30 raw readings + expected Python probabilities
"""

from __future__ import annotations

import json
import os

import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score
from sklearn.model_selection import train_test_split

from generate_dataset import generate
from plant_recommendations import PLANTS_BY_SOIL, SOIL_NOTE
from train import FEATURES, add_features

HERE = os.path.dirname(os.path.abspath(__file__))
OUT_DIR = os.path.join(HERE, "web", "src", "model")


def tree_to_dict(tree) -> dict:
    t = tree.tree_
    # Leaf values: class counts -> normalized probabilities, rounded is NOT
    # allowed (parity!), keep full precision.
    value = t.value.reshape(t.node_count, -1)
    probs = value / value.sum(axis=1, keepdims=True)
    return {
        "left": t.children_left.tolist(),
        "right": t.children_right.tolist(),
        "feature": t.feature.tolist(),
        "threshold": t.threshold.tolist(),
        "probs": probs.tolist(),
    }


def main() -> None:
    df = add_features(generate())
    df_tr, df_te = train_test_split(
        df, test_size=0.25, random_state=42, stratify=df["soil_type"]
    )

    clf = RandomForestClassifier(
        n_estimators=40,
        max_depth=8,
        min_samples_leaf=2,
        random_state=42,
        n_jobs=-1,
    )
    clf.fit(df_tr[FEATURES].values, df_tr["soil_type"].values)
    acc = accuracy_score(
        df_te["soil_type"].values, clf.predict(df_te[FEATURES].values)
    )
    print(f"Compact model test accuracy: {acc:.3f} "
          f"({clf.n_estimators} trees, depth<={clf.max_depth})")

    os.makedirs(OUT_DIR, exist_ok=True)

    model_json = {
        "features": FEATURES,
        "classes": clf.classes_.tolist(),
        "test_accuracy": round(float(acc), 4),
        "trees": [tree_to_dict(est) for est in clf.estimators_],
    }
    with open(os.path.join(OUT_DIR, "soil_rf.json"), "w", encoding="utf-8") as f:
        json.dump(model_json, f, separators=(",", ":"))
    size_kb = os.path.getsize(os.path.join(OUT_DIR, "soil_rf.json")) / 1024
    print(f"soil_rf.json: {size_kb:.0f} KB")

    # تعريب ملاحظات التربة وأسباب اختيار النبات لواجهة الموقع العربية.
    AR_NOTE = {
        "Sandy": "احتفاظ منخفض بالماء والمغذيات — الأولوية لمثبّتات الكثبان "
                 "والأنواع عميقة الجذور، مع مادة عضوية داخل الكبسولة.",
        "Silty": "احتفاظ جيد بالرطوبة لكنها عرضة للانجراف — المحاصيل الغطائية "
                 "والسمر تثبّت السطح وتعيد بناء التربة.",
        "Loam":  "أفضل تربة زراعية عامة — أوسع خيارات للزراعة وأعلى نسبة نجاح "
                 "متوقعة للتشجير.",
        "Clay":  "غنية بالمغذيات لكن صرفها ضعيف وتتصلب عند الجفاف — الأنسب "
                 "أنواع تتحمل الملوحة وركود الماء.",
    }
    AR_WHY = {
        "Ghaf (Prosopis cineraria)": "جذر وتدي عميق، يثبّت الكثبان، قليل الماء",
        "Desert thorn / Sidr (Ziziphus spina-christi)": "محلي، يتحمل الجفاف والحرارة",
        "Saltbush (Atriplex)": "يربط الرمال ويتحمل الملوحة",
        "Prickly pear cactus (Opuntia)": "ماء قليل جداً، يكافح انجراف التربة",
        "Acacia (Vachellia tortilis)": "سنط محلي، يثبّت النيتروجين في التربة",
        "Moringa (Moringa peregrina)": "سريع النمو، متكيف مع الجفاف",
        "Sidr (Ziziphus spina-christi)": "شجرة ظل منتجة ومحلية",
        "Sorghum / millet cover": "محصول غطائي يمسك الطمي",
        "Date palm (Phoenix dactylifera)": "محصول اللوم المثالي وعالي القيمة",
        "Olive (Olea europaea)": "يحب اللوم ويتحمل الجفاف بعد التثبيت",
        "Fig (Ficus carica)": "منتج على الترب المتوازنة",
        "Acacia / Sidr mix": "مصدّ رياح زراعي حرجي",
        "Eucalyptus (drought-tolerant sp.)": "يتعامل مع الطين الثقيل الحابس للماء",
        "Tamarix / Athel (Tamarix aphylla)": "مصدّ رياح يتحمل الملح والطين",
        "Pomegranate (Punica granatum)": "يتحمل الترب الثقيلة",
        "Conocarpus (windbreak, with care)": "قوي التحمل — مع الانتباه لاستهلاك الماء",
    }
    plants = {
        soil: {
            "note": AR_NOTE[soil],
            "note_en": SOIL_NOTE[soil],
            "plants": [
                {"en": en, "ar": ar, "why": AR_WHY[en]}
                for en, ar, _why in PLANTS_BY_SOIL[soil]
            ],
        }
        for soil in PLANTS_BY_SOIL
    }
    with open(os.path.join(OUT_DIR, "plants.json"), "w", encoding="utf-8") as f:
        json.dump(plants, f, ensure_ascii=False, indent=1)

    # Parity fixtures: raw readings + expected probabilities from THIS model.
    rng = np.random.default_rng(7)
    idx = rng.choice(len(df_te), size=30, replace=False)
    raw_cols = ["K_pct", "U_ppm", "Th_ppm", "Cs137_Bq_kg", "total_count_nGy_h"]
    cases = []
    for i in idx:
        row = df_te.iloc[int(i)]
        proba = clf.predict_proba(row[FEATURES].values.reshape(1, -1))[0]
        cases.append({
            "raw": {c: float(row[c]) for c in raw_cols},
            "expected": {c: float(p) for c, p in zip(clf.classes_, proba)},
        })
    with open(os.path.join(OUT_DIR, "parity_cases.json"), "w", encoding="utf-8") as f:
        json.dump(cases, f, indent=1)

    print(f"Wrote plants.json + parity_cases.json (30 cases) -> {OUT_DIR}")


if __name__ == "__main__":
    main()
