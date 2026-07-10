# Drone Gamma-Ray Soil Classifier · مصنّف التربة بأشعة جاما من الدرون

Predict **soil texture** (Sandy / Silty / Loam / Clay) from a drone-mounted
**gamma-ray spectrometry** reading, then recommend the best plant species for
re-greening that spot — the analysis layer behind a drone that surveys land
and drops biodegradable **seed capsules**.

تصنيف **نوع التربة** (رملية / طميية / لومية / طينية) من قراءة **مطياف أشعة
جاما** المحمول على درون، ثم اقتراح أنسب النباتات لتشجير الموقع — وهي طبقة
التحليل خلف فكرة الدرون الذي يمسح الأرض ويُطلق **الرصاصة/الكبسولة الزراعية**
القابلة للتحلل.

---

## The science / الأساس العلمي

Every soil emits natural gamma radiation from decaying radionuclides:
**Potassium (K-40), Uranium (U-238), Thorium (Th-232)**, plus anthropogenic
**Cesium (Cs-137)** fallout. A drone sensor (e.g. **Medusa MS-350**, integrated
by SPH Engineering) measures the concentration of each channel from the air.

Because each soil texture has a different mineralogy, it has a different
gamma fingerprint:

| Soil | K (%) | eTh (ppm) | eU (ppm) | Why |
|------|-------|-----------|----------|-----|
| **Sandy** | low (~0.6) | low (~4) | low (~1.2) | quartz-rich, few clay minerals → little radioactivity |
| **Silty** | mid (~1.5) | mid (~9) | mid (~2.6) | intermediate |
| **Loam** | mid-high (~1.8) | mid-high (~10.5) | mid-high (~3.0) | balanced mix |
| **Clay** | high (~2.4) | high (~14) | high (~3.8) | clay minerals adsorb & concentrate K, Th, U |

The **Th/K** and **U/K** ratios (used in gamma-ray geology) further separate
clay mineralogy. Cs-137 is fallout, **not** mineralogical — the model learns to
mostly ignore it (a built-in honesty check).

> كل نوع تربة له بصمة إشعاعية مختلفة لأن تركيبته المعدنية مختلفة: التربة
> الطينية تمتص وتركّز البوتاسيوم والثوريوم واليورانيوم فتكون قراءتها عالية،
> بينما التربة الرملية (كوارتز) قراءتها منخفضة. نسبة Th/K تساعد على التمييز.

---

## Pipeline / خطوات العمل

```
gamma reading (K, U, Th, Cs, total count)
        │
        ▼
  RandomForest classifier  ──►  soil type + confidence
        │
        ▼
  plant recommendation      ──►  species for the seed capsule
```

Files:
- `generate_dataset.py` — builds a literature-grounded training set (see below).
- `train.py` — trains the RandomForest, writes metrics + plots + model.
- `predict.py` — CLI: one reading → soil type → plant list.
- `plant_recommendations.py` — soil → drought-tolerant species (Gulf/KSA).
- `import_real_survey.py` — adapter for real USGS/SPH/Medusa CSV exports.

---

## Quick start / التشغيل

```bash
pip install -r requirements.txt
python generate_dataset.py     # -> data/soil_gamma_samples.csv (2000 samples)
python train.py                # -> models/ + outputs/ (metrics + plots)

# classify one drone reading:
python predict.py --K 0.5 --U 1.0 --Th 3.5              # -> Sandy
python predict.py --K 2.4 --U 3.9 --Th 14.5 --Cs137 3  # -> Clay
```

`--total_count` is optional; if omitted it is estimated from K/U/Th using the
UNSCEAR dose-rate model, so real exports carrying only the three channels work.

---

## Results / النتائج

Held-out test accuracy **~0.70**, 5-fold CV **0.69 ± 0.02**. This is a
*realistic and honest* number, not an inflated one:

- **Sandy** is cleanly separable — F1 **0.94** (its low-radioactivity
  signature is unmistakable).
- **Clay** — F1 **0.76**.
- **Silty ↔ Loam** overlap heavily (F1 ~0.5–0.6) — exactly as reported in real
  gamma-ray soil-texture surveys, where intermediate textures share a
  fingerprint.

Most discriminative signals: **K %, Th ppm, total count** — matching the
physics. See `outputs/confusion_matrix.png` and `outputs/feature_importance.png`.

> النتيجة ~70% وهي واقعية وصادقة: التربة الرملية تُميَّز بدقة عالية جداً،
> والطينية جيدة، بينما الطميية واللومية تتداخلان (كما في الدراسات الحقيقية).

---

## Using real data / استخدام داتا حقيقية

There is no single open CSV that maps a full gamma spectrum to a *labelled*
soil-texture class, so the training set here reproduces the **documented
statistical signatures** of each class (grounded in the gamma-ray-for-soil
literature). To go fully real:

1. Get a survey CSV with K %, eU ppm, eTh ppm (+ total count):
   - **USGS NURE / national airborne radiometric** flight-line CSVs (open).
   - **SPH Engineering / Medusa MS-350** test-range exports.
2. Attach a texture label per point (join to SoilGrids / gNATSGO, or lab
   ground-truth samples).
3. Convert and retrain:
   ```bash
   python import_real_survey.py --in survey.csv \
       --out data/soil_gamma_samples.csv --label-col texture
   python train.py
   ```
The model code does not change — only the CSV behind it.

> لا يوجد داتاسِت مفتوح جاهز يربط طيف جاما الكامل بنوع تربة مُصنَّف، لذلك
> بيانات التدريب هنا تحاكي البصمات الإحصائية الموثّقة لكل نوع. لاستخدام داتا
> حقيقية: احصل على مسح جاما (USGS أو SPH/Medusa)، أرفق له تصنيف التربة، ثم
> شغّل `import_real_survey.py` وأعد التدريب — الكود نفسه لا يتغيّر.

---

## Notes / ملاحظات

- Gamma radiometrics infer texture indirectly; ground-truth calibration for a
  region is recommended before operational decisions.
- Plant lists are indicative defaults for arid Gulf conditions — confirm with an
  agronomist for salinity, rainfall, and elevation of the actual site.
- The real Medusa/SPH sensor and its raw data may require a licence/permit for
  operational use.

## References / مراجع

- SPH Engineering — Drone-integrated Gamma-ray radiation sensor (Medusa MS-350).
- Airborne gamma-ray spectrometry as a surrogate for soil texture (peer-reviewed
  soil-mapping literature).
- IAEA — guidelines on gamma-ray spectrometry of natural radionuclides in soil.
- UNSCEAR 2000 — dose-rate conversion coefficients for K-40, U-238, Th-232.
