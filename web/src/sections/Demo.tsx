import { useEffect, useRef, useState } from "react";
import SectionBadge from "../components/SectionBadge";
import SaudiMap from "../components/SaudiMap";
import { LeafIcon } from "../components/icons";
import { demo } from "../data/content";
import { regionGeology, sampleReading } from "../data/regions";
import { regionShapes } from "../data/saudi-map";
import {
  ensureModel,
  predict,
  type GammaReading,
  type Prediction,
  type SoilClass,
} from "../model/predict";
import plants from "../model/plants.json";

type PlantRec = { note: string; plants: { en: string; ar: string; why: string }[] };

interface ScanState {
  status: "idle" | "scanning" | "done";
  regionId: string | null;
  reading: GammaReading | null;
  prediction: Prediction | null;
}

const SCAN_MS = 950;

function ConfidenceBars({ probs }: { probs: Record<SoilClass, number> }) {
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
          <span className={`text-sm ${i === 0 ? "font-bold text-espresso" : "text-ink-soft"}`}>
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

export default function Demo() {
  const [scan, setScan] = useState<ScanState>({
    status: "idle",
    regionId: null,
    reading: null,
    prediction: null,
  });
  const timer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    // تحميل الموديل مسبقاً كي يكون جاهزاً قبل أول فحص
    void ensureModel();
    return () => clearTimeout(timer.current);
  }, []);

  const runScan = (regionId: string) => {
    clearTimeout(timer.current);
    setScan({ status: "scanning", regionId, reading: null, prediction: null });
    timer.current = setTimeout(async () => {
      await ensureModel();
      const reading = sampleReading(regionId);
      const prediction = predict(reading);
      setScan({ status: "done", regionId, reading, prediction });
    }, SCAN_MS);
  };

  const region = regionShapes.find((r) => r.id === scan.regionId);
  const geo = scan.regionId ? regionGeology[scan.regionId] : null;
  const rec: PlantRec | null = scan.prediction
    ? (plants as Record<string, PlantRec>)[scan.prediction.soil]
    : null;

  return (
    <section id="demo" className="bg-paper py-16 md:py-24">
      <div className="mx-auto max-w-6xl px-5 md:px-8">
        <SectionBadge>{demo.title}</SectionBadge>
        <p className="max-w-3xl text-xl leading-relaxed text-ink">{demo.lead}</p>

        <div className="mt-12 grid items-start gap-10 lg:grid-cols-[1fr_1fr]">
          {/* الخريطة */}
          <div>
            <SaudiMap
              selected={scan.regionId}
              scanning={scan.status === "scanning"}
              onSelect={runScan}
            />
            <p className="mt-3 text-center text-sm text-ink-soft">
              {region ? `المنطقة المختارة: ${region.ar}` : "اختر منطقة من الخريطة"}
            </p>
          </div>

          {/* بطاقة النتيجة */}
          <div className="min-h-80 rounded-[4px] bg-sand p-6 md:p-8" aria-live="polite">
            {scan.status === "idle" && (
              <div className="flex h-full min-h-64 flex-col items-center justify-center gap-4 text-center">
                <LeafIcon className="h-12 w-12 text-olive/50" />
                <p className="max-w-xs text-ink-soft">
                  نتيجة الفحص ستظهر هنا: نوع التربة، قراءة الجاما، والنباتات
                  الموصى بزراعتها
                </p>
              </div>
            )}

            {scan.status === "scanning" && (
              <div className="flex h-full min-h-64 flex-col items-center justify-center gap-4 text-center">
                <p className="display text-xl font-bold text-espresso">
                  جارٍ فحص تربة {region?.ar}…
                </p>
                <p className="text-sm text-ink-soft">
                  قياس نظائر البوتاسيوم واليورانيوم والثوريوم
                </p>
              </div>
            )}

            {scan.status === "done" && scan.prediction && scan.reading && rec && (
              <div>
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <div>
                    <p className="text-sm text-ink-soft">
                      {region?.ar} — {geo?.hint}
                    </p>
                    <p className="display mt-1 text-3xl font-extrabold text-espresso">
                      تربة {demo.soilNames[scan.prediction.soil]}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => scan.regionId && runScan(scan.regionId)}
                    className="text-sm text-olive underline decoration-2 underline-offset-4 transition-colors hover:text-espresso"
                  >
                    {demo.scanButton}
                  </button>
                </div>

                <div className="mt-5">
                  <ConfidenceBars probs={scan.prediction.probs} />
                </div>

                {/* قراءة الجاما */}
                <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-2 border-t border-cream pt-4 sm:grid-cols-4">
                  {(
                    [
                      ["K", `${scan.reading.K_pct}`, "%"],
                      ["U", `${scan.reading.U_ppm}`, "ppm"],
                      ["Th", `${scan.reading.Th_ppm}`, "ppm"],
                      ["العد الكلي", `${scan.reading.total_count_nGy_h}`, "nGy/h"],
                    ] as const
                  ).map(([label, val, unit]) => (
                    <div key={label}>
                      <dt className="text-xs text-ink-soft">{label}</dt>
                      <dd className="num display text-base font-bold text-ink">
                        {val} <span className="text-xs font-normal">{unit}</span>
                      </dd>
                    </div>
                  ))}
                </dl>

                {/* التوصية */}
                <div className="mt-5 border-t border-cream pt-4">
                  <p className="text-sm leading-relaxed text-ink">{rec.note}</p>
                  <ul className="mt-3 space-y-2">
                    {rec.plants.slice(0, 3).map((p) => (
                      <li key={p.en} className="flex items-start gap-2.5">
                        <LeafIcon className="mt-1 h-4 w-4 shrink-0 text-leaf" />
                        <span className="text-sm leading-relaxed">
                          <strong className="text-espresso">{p.ar}</strong>
                          <span className="text-ink-soft"> — {p.why}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                <p className="mt-5 text-xs text-ink-soft">{demo.disclaimer}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
