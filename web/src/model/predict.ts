/**
 * منفّذ الموديل الحقيقي بالمتصفح — غابة انحدارية تتنبأ بنسبتي الطين والرمل
 * من قراءة جاما (K, U, Th)، ثم يُشتق صنف التربة من الكسور عبر مثلث USDA.
 *
 * مدرَّب على Data/real_training_set.csv: مسح USGS الإشعاعي × نسيج SoilGrids.
 * يطابق مخرجات sklearn في export_web_model.py (يثبت ذلك predict.test.ts).
 *
 * هندسة الخصائص نسخة حرفية من build_real_dataset.py — أي تعديل هناك
 * يستلزم إعادة التصدير والتعديل هنا معاً.
 */
export type SoilClass = "Clay" | "Loam" | "Sandy" | "Silty";

export interface GammaReading {
  /** بوتاسيوم % */
  K: number;
  /** يورانيوم مكافئ ppm */
  U: number;
  /** ثوريوم مكافئ ppm */
  Th: number;
}

export interface Prediction {
  soil: SoilClass;
  /** نسبة أشجار الغابة المصوّتة لكل صنف — مقياس اتفاق لا احتمال معايَر */
  probs: Record<SoilClass, number>;
  clay: number;
  sand: number;
  silt: number;
  totalCount: number;
}

export interface ModelMetrics {
  interp: { clay_r2: number; clay_mae: number; sand_mae: number; class_accuracy: number };
  extrap: { clay_r2: number; clay_mae: number; sand_mae: number; class_accuracy: number };
  majority_baseline: number;
  n_train: number;
}

/** معدل الجرعة الممتصة nGy/h — معاملات UNSCEAR 2000، نفس معادلة بايثون */
export function doseRate(K: number, U: number, Th: number): number {
  return 0.0417 * (K * 313.0) + 0.462 * (U * 12.35) + 0.604 * (Th * 4.06);
}

/** الترتيب مطابق لـ FEATURES في export_web_model.py */
function engineer(r: GammaReading): number[] {
  const k = Math.max(r.K, 0.05);
  const u = Math.max(r.U, 0.1);
  return [
    r.K,
    r.U,
    r.Th,
    r.Th / k,
    r.U / k,
    r.Th / u,
    doseRate(r.K, r.U, r.Th),
  ];
}

/**
 * مثلث النسيج المعتمد من USDA — منقول حرفياً عن
 * fetch_soilgrids_labels.py::usda_texture. الترتيب جزء من الصحة.
 */
export function usdaTexture(sand: number, silt: number, clay: number): string {
  if (silt + 1.5 * clay < 15) return "sand";
  if (silt + 1.5 * clay >= 15 && silt + 2 * clay < 30) return "loamy sand";
  if (
    (clay >= 7 && clay < 20 && sand > 52 && silt + 2 * clay >= 30) ||
    (clay < 7 && silt < 50 && silt + 2 * clay >= 30)
  )
    return "sandy loam";
  if (clay >= 7 && clay < 27 && silt >= 28 && silt < 50 && sand <= 52)
    return "loam";
  if ((silt >= 50 && clay >= 12 && clay < 27) || (silt >= 50 && silt < 80 && clay < 12))
    return "silt loam";
  if (silt >= 80 && clay < 12) return "silt";
  if (clay >= 20 && clay < 35 && silt < 28 && sand > 45) return "sandy clay loam";
  if (clay >= 27 && clay < 40 && sand > 20 && sand <= 45) return "clay loam";
  if (clay >= 27 && clay < 40 && sand <= 20) return "silty clay loam";
  if (clay >= 35 && sand > 45) return "sandy clay";
  if (clay >= 40 && silt >= 40) return "silty clay";
  if (clay >= 40 && sand <= 45 && silt < 40) return "clay";
  return "unknown";
}

/** التجميع بمحتوى الطين — نفس GROUP_12_TO_4 في بايثون */
const GROUP: Record<string, SoilClass> = {
  sand: "Sandy", "loamy sand": "Sandy", "sandy loam": "Sandy",
  silt: "Silty", "silt loam": "Silty",
  loam: "Loam", "sandy clay loam": "Loam",
  "clay loam": "Clay", "silty clay loam": "Clay",
  clay: "Clay", "sandy clay": "Clay", "silty clay": "Clay",
};

export function toSoilClass(clay: number, sand: number): SoilClass {
  const c = Math.min(100, Math.max(0, clay));
  const s = Math.min(100, Math.max(0, sand));
  const silt = Math.min(100, Math.max(0, 100 - c - s));
  return GROUP[usdaTexture(s, silt, c)] ?? "Loam";
}

interface Tree {
  left: number[];
  right: number[];
  feature: number[];
  threshold: number[];
  /** أوراق الانحدار: [clay, sand] */
  value: number[][];
}

interface Model {
  kind: string;
  features: string[];
  metrics: ModelMetrics;
  source: string;
  trees: Tree[];
}

/** الموديل (~800KB) يُحمَّل ديناميكياً كي لا يؤخر العرض الأولي */
let model: Model | null = null;

export async function ensureModel(): Promise<void> {
  if (!model) {
    model = (await import("./soil_real_rf.json")).default as unknown as Model;
  }
}

export function modelMetrics(): ModelMetrics | null {
  return model?.metrics ?? null;
}

function walkTree(tree: Tree, x: number[]): number[] {
  let node = 0;
  while (tree.left[node] !== -1) {
    node = x[tree.feature[node]] <= tree.threshold[node]
      ? tree.left[node]
      : tree.right[node];
  }
  return tree.value[node];
}

const CLASSES: SoilClass[] = ["Sandy", "Silty", "Loam", "Clay"];

export function predict(reading: GammaReading): Prediction {
  if (!model) throw new Error("Model not loaded — call ensureModel() first");

  const x = engineer(reading);
  let claySum = 0;
  let sandSum = 0;
  const votes: Record<SoilClass, number> = { Sandy: 0, Silty: 0, Loam: 0, Clay: 0 };

  for (const tree of model.trees) {
    const [c, s] = walkTree(tree, x);
    claySum += c;
    sandSum += s;
    votes[toSoilClass(c, s)] += 1;
  }

  const n = model.trees.length;
  const clay = claySum / n;
  const sand = sandSum / n;
  const silt = Math.max(0, 100 - clay - sand);

  const probs = {} as Record<SoilClass, number>;
  for (const c of CLASSES) probs[c] = votes[c] / n;

  return {
    soil: toSoilClass(clay, sand),
    probs,
    clay,
    sand,
    silt,
    totalCount: x[6],
  };
}
