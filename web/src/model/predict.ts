/**
 * منفّذ RandomForest بالمتصفح — يطابق مخرجات sklearn predict_proba
 * للموديل المصدَّر في soil_rf.json (يُثبت التطابق اختبار predict.test.ts).
 *
 * هندسة الخصائص هنا نسخة حرفية من train.py::add_features —
 * أي تعديل هناك يستلزم إعادة التصدير والتعديل هنا معاً.
 */
export type SoilClass = "Clay" | "Loam" | "Sandy" | "Silty";

export interface GammaReading {
  K_pct: number;
  U_ppm: number;
  Th_ppm: number;
  Cs137_Bq_kg: number;
  /** يُشتق من K/U/Th عند غيابه (معاملات UNSCEAR 2000) */
  total_count_nGy_h?: number;
}

export interface Prediction {
  soil: SoilClass;
  probs: Record<SoilClass, number>;
  totalCount: number;
}

/** معدل الجرعة الممتصة nGy/h — نفس معادلة generate_dataset.py حرفياً */
export function doseRate(K: number, U: number, Th: number): number {
  return 0.0417 * (K * 313.0) + 0.462 * (U * 12.35) + 0.604 * (Th * 4.06);
}

function engineer(r: GammaReading): number[] {
  const tc = r.total_count_nGy_h ?? doseRate(r.K_pct, r.U_ppm, r.Th_ppm);
  const kSafe = Math.max(r.K_pct, 0.05);
  const uSafe = Math.max(r.U_ppm, 0.1);
  // الترتيب مطابق لـ FEATURES في train.py
  return [
    r.K_pct,
    r.U_ppm,
    r.Th_ppm,
    r.Cs137_Bq_kg,
    tc,
    r.Th_ppm / kSafe,
    r.U_ppm / kSafe,
    r.Th_ppm / uSafe,
  ];
}

interface Tree {
  left: number[];
  right: number[];
  feature: number[];
  threshold: number[];
  probs: number[][];
}

interface Model {
  features: string[];
  classes: string[];
  test_accuracy: number;
  trees: Tree[];
}

/**
 * الموديل (408KB) يُحمَّل ديناميكياً كي لا يؤخر العرض الأولي —
 * قسم الديمو يستدعي ensureModel() عند التركيب.
 */
let model: Model | null = null;

export async function ensureModel(): Promise<void> {
  if (!model) {
    model = (await import("./soil_rf.json")).default as unknown as Model;
  }
}

function walkTree(tree: Tree, x: number[]): number[] {
  let node = 0;
  while (tree.left[node] !== -1) {
    node = x[tree.feature[node]] <= tree.threshold[node]
      ? tree.left[node]
      : tree.right[node];
  }
  return tree.probs[node];
}

export function predict(reading: GammaReading): Prediction {
  if (!model) {
    throw new Error("Model not loaded — call ensureModel() first");
  }
  const x = engineer(reading);
  const classes = model.classes as SoilClass[];
  const sums = new Array<number>(classes.length).fill(0);

  for (const tree of model.trees as Tree[]) {
    const p = walkTree(tree, x);
    for (let c = 0; c < sums.length; c++) sums[c] += p[c];
  }

  const probs = {} as Record<SoilClass, number>;
  let best: SoilClass = classes[0];
  for (let c = 0; c < classes.length; c++) {
    probs[classes[c]] = sums[c] / model.trees.length;
    if (probs[classes[c]] > probs[best]) best = classes[c];
  }

  return { soil: best, probs, totalCount: x[4] };
}
