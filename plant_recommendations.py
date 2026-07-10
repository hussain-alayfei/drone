"""
plant_recommendations.py
------------------------
Maps a predicted soil texture class to candidate plant / tree species for
re-vegetation and afforestation in arid and semi-arid regions (Gulf / Saudi
Arabia context). This is the "what should we plant here" layer that turns a
soil reading into an actionable re-greening decision -- and the payload spec
for the biodegradable "seed bullet" dropped by the drone.

The recommendations below are drawn from common drought-tolerant and
native species used in Gulf afforestation and desertification-control
programmes. They are indicative defaults; an agronomist should confirm for a
specific site (rainfall, salinity, elevation).
"""

from __future__ import annotations

# species: (English, Arabic, note)
PLANTS_BY_SOIL = {
    "Sandy": [
        ("Ghaf (Prosopis cineraria)", "الغاف", "deep taproot, stabilises dunes, low water"),
        ("Desert thorn / Sidr (Ziziphus spina-christi)", "السدر", "native, drought & heat hardy"),
        ("Saltbush (Atriplex)", "القطف/الرغل", "sand-binding, tolerates salinity"),
        ("Prickly pear cactus (Opuntia)", "الصبار", "very low water, erosion control"),
    ],
    "Silty": [
        ("Acacia (Vachellia tortilis)", "السمر/الطلح", "native acacia, fixes nitrogen"),
        ("Moringa (Moringa peregrina)", "المورينجا/اليسر", "fast-growing, arid-adapted"),
        ("Sidr (Ziziphus spina-christi)", "السدر", "productive shade tree"),
        ("Sorghum / millet cover", "الذرة/الدخن", "cover crop, holds silt"),
    ],
    "Loam": [
        ("Date palm (Phoenix dactylifera)", "النخيل", "ideal loam crop, high value"),
        ("Olive (Olea europaea)", "الزيتون", "loam-loving, drought tolerant once set"),
        ("Fig (Ficus carica)", "التين", "productive on balanced soils"),
        ("Acacia / Sidr mix", "السمر والسدر", "agroforestry windbreak"),
    ],
    "Clay": [
        ("Eucalyptus (drought-tolerant sp.)", "الكينا/الكافور", "handles heavy, water-retentive clay"),
        ("Tamarix / Athel (Tamarix aphylla)", "الأثل", "salt & clay tolerant windbreak"),
        ("Pomegranate (Punica granatum)", "الرمان", "tolerates heavier soils"),
        ("Conocarpus (windbreak, with care)", "الكونوكاربس", "hardy, but high water use"),
    ],
}

# Coarse suitability / caution note per class for re-greening.
SOIL_NOTE = {
    "Sandy": "Low nutrient & water retention. Prioritise dune stabilisers and "
             "deep-rooted natives; add organic matter in the seed capsule.",
    "Silty": "Good moisture retention, erosion-prone. Cover crops + acacias "
             "hold the surface and rebuild structure.",
    "Loam":  "Best general agricultural soil. Widest planting choice; highest "
             "afforestation success expected.",
    "Clay":  "High nutrients but poor drainage / hard when dry. Use salt- and "
             "waterlogging-tolerant species; avoid shallow-rooted crops.",
}


def recommend(soil_type: str, top_n: int = 4):
    plants = PLANTS_BY_SOIL.get(soil_type, [])[:top_n]
    return {
        "soil_type": soil_type,
        "note": SOIL_NOTE.get(soil_type, ""),
        "plants": plants,
    }


def format_recommendation(soil_type: str, top_n: int = 4) -> str:
    r = recommend(soil_type, top_n)
    lines = [f"Re-greening note: {r['note']}", "", "Candidate species:"]
    for en, ar, why in r["plants"]:
        lines.append(f"  - {en}  [{ar}]  -- {why}")
    return "\n".join(lines)


if __name__ == "__main__":
    for s in PLANTS_BY_SOIL:
        print(f"\n=== {s} ===")
        print(format_recommendation(s))
