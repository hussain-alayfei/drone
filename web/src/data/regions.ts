/**
 * عرض «المملكة — إسقاط تقديري»: لا يوجد مسح إشعاعي جوي مفتوح للسعودية،
 * فهذا العرض يوضح شكل النشر المستهدف ولا يدّعي قياساً. عند كل فحص تُسحب
 * قراءة جاما من البصمة الإشعاعية المعروفة للنوع الجيولوجي المرجّح في
 * المنطقة (رمال الدهناء شرقاً، بازلت عسير، طين سهل جازان الفيضي…)، ثم
 * يصنّفها نفس الموديل الحقيقي الذي يعمل على بيانات USGS — الموديل واحد،
 * ومصدر القراءة هو المختلف، والواجهة تصرّح بذلك.
 */
import type { GammaReading, SoilClass } from "../model/predict";

type Weights = Record<SoilClass, number>;

export const regionGeology: Record<string, { weights: Weights; hint: string }> = {
  eastern: {
    weights: { Sandy: 0.55, Clay: 0.2, Loam: 0.13, Silty: 0.12 },
    hint: "رمال الدهناء والربع الخالي مع سبخات ساحلية",
  },
  najran: {
    weights: { Sandy: 0.5, Silty: 0.25, Loam: 0.15, Clay: 0.1 },
    hint: "حافة الربع الخالي وأودية موسمية",
  },
  northern: {
    weights: { Silty: 0.4, Sandy: 0.3, Loam: 0.2, Clay: 0.1 },
    hint: "حماد صخري وترسبات طمية",
  },
  hail: {
    weights: { Sandy: 0.45, Loam: 0.3, Silty: 0.15, Clay: 0.1 },
    hint: "النفود الكبير تحده أودية زراعية",
  },
  riyadh: {
    weights: { Sandy: 0.35, Loam: 0.3, Silty: 0.2, Clay: 0.15 },
    hint: "هضاب نجد الكلسية ورمال وأودية",
  },
  asir: {
    weights: { Loam: 0.4, Silty: 0.3, Clay: 0.2, Sandy: 0.1 },
    hint: "مرتفعات بازلتية ومدرجات زراعية",
  },
  makkah: {
    weights: { Sandy: 0.35, Silty: 0.3, Loam: 0.25, Clay: 0.1 },
    hint: "سهل تهامة الساحلي وحرات بركانية",
  },
  tabuk: {
    weights: { Sandy: 0.45, Silty: 0.25, Loam: 0.2, Clay: 0.1 },
    hint: "تكوينات رملية وصخرية شمالية غربية",
  },
  madinah: {
    weights: { Silty: 0.3, Sandy: 0.3, Loam: 0.25, Clay: 0.15 },
    hint: "حرات بركانية وأودية خصبة",
  },
  qassim: {
    weights: { Loam: 0.45, Sandy: 0.25, Silty: 0.2, Clay: 0.1 },
    hint: "قلب زراعي — أودية الرمة الخصبة",
  },
  bahah: {
    weights: { Loam: 0.4, Silty: 0.3, Clay: 0.15, Sandy: 0.15 },
    hint: "مرتفعات ومدرجات زراعية ضبابية",
  },
  jazan: {
    weights: { Clay: 0.4, Loam: 0.3, Silty: 0.2, Sandy: 0.1 },
    hint: "سهل فيضي طيني — الأخصب في المملكة",
  },
  jawf: {
    weights: { Loam: 0.35, Silty: 0.3, Sandy: 0.25, Clay: 0.1 },
    hint: "واحات الجوف الزراعية وحماد",
  },
};

/**
 * بصمات الأنواع (متوسط، انحراف) لكل قناة — من أدبيات القياس الطيفي للتربة.
 * ملاحظة: مجموعة Clay هنا تشمل clay loam فما فوق (نفس تجميع الموديل الحقيقي).
 */
const CLASS_STATS: Record<SoilClass, { K: [number, number]; U: [number, number]; Th: [number, number] }> = {
  Sandy: { K: [0.6, 0.25], U: [1.2, 0.5], Th: [4.0, 1.5] },
  Silty: { K: [1.5, 0.35], U: [2.6, 0.6], Th: [9.0, 2.0] },
  Loam: { K: [1.8, 0.4], U: [3.0, 0.7], Th: [10.5, 2.2] },
  Clay: { K: [2.4, 0.4], U: [3.8, 0.8], Th: [14.0, 2.5] },
};

function randn(): number {
  // Box–Muller
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function pickSoil(weights: Weights): SoilClass {
  const r = Math.random();
  let acc = 0;
  for (const [soil, w] of Object.entries(weights) as [SoilClass, number][]) {
    acc += w;
    if (r <= acc) return soil;
  }
  return "Sandy";
}

/** سحب قراءة جاما من التوزيع الجيولوجي المرجّح للمنطقة */
export function sampleReading(regionId: string): GammaReading {
  const geo = regionGeology[regionId];
  const soil = pickSoil(geo.weights);
  const s = CLASS_STATS[soil];

  // عامل كامن مشترك يحفظ الترابط الفيزيائي بين القنوات (طين أكثر = كلها أعلى)
  const f = randn();
  const mix = (z: number) => 0.75 * f + 0.66 * z;

  return {
    K: +Math.max(s.K[0] + s.K[1] * mix(randn()), 0.05).toFixed(3),
    U: +Math.max(s.U[0] + s.U[1] * mix(randn()), 0.1).toFixed(3),
    Th: +Math.max(s.Th[0] + s.Th[1] * mix(randn()), 0.5).toFixed(3),
  };
}
