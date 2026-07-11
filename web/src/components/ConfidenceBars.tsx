import { demo } from "../data/content";
import type { SoilClass } from "../model/predict";

/** توزيع ثقة الموديل على أنواع التربة الأربعة — الأعلى أولاً */
export default function ConfidenceBars({
  probs,
}: {
  probs: Record<SoilClass, number>;
}) {
  const rows = (Object.entries(probs) as [SoilClass, number][]).sort(
    (a, b) => b[1] - a[1],
  );

  return (
    <div role="list" aria-label="نسب الثقة لكل نوع تربة">
      {rows.map(([soil, p], i) => (
        <div
          key={soil}
          role="listitem"
          className="grid grid-cols-[4.5rem_1fr_3rem] items-center gap-2 py-1"
          aria-label={`${demo.soilNames[soil]}: ${Math.round(p * 100)}%`}
        >
          <span
            className={`text-sm ${i === 0 ? "font-bold text-espresso" : "text-ink-soft"}`}
          >
            {demo.soilNames[soil]}
          </span>
          <div className="h-3 overflow-hidden rounded-l-[4px] bg-espresso/8">
            <div
              className={`h-full rounded-l-[4px] ${i === 0 ? "bg-olive" : "bg-gold"}`}
              style={{ width: `${Math.max(p * 100, 1.5)}%` }}
            />
          </div>
          <span className="num display text-xs font-bold text-ink">
            {Math.round(p * 100)}%
          </span>
        </div>
      ))}
    </div>
  );
}
