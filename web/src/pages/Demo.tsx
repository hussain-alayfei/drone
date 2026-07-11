/**
 * التجربة الحية — منفصلة عن الصفحة التعريفية عمداً: هنا لا يوجد نص تسويقي،
 * فقط منهجية وبيانات ونتيجة.
 *
 * الخريطة تعمل على شبكة USGS الحقيقية. الموديل يحتاج ثلاث قنوات (K, U, Th)
 * كي يتنبأ؛ إن كان التصدير الحالي ينقصه شيء منها نعرض القراءة الحقيقية
 * ونصرّح بأن التصنيف معطّل — ولا نخترع نتيجة.
 */
import { Suspense, lazy, useEffect, useRef, useState } from "react";
import SectionBadge from "../components/SectionBadge";
import ConfidenceBars from "../components/ConfidenceBars";
import { LeafIcon, RadiationIcon } from "../components/icons";
import { demo } from "../data/content";
import { loadGrid, type Channel, type Grid } from "../data/grid";
import {
  doseRate,
  ensureModel,
  predict,
  type GammaReading,
  type Prediction,
} from "../model/predict";
import plants from "../model/plants.json";
import type { Cell } from "../three/RadiometricTerrain";

const RadiometricTerrain = lazy(() => import("../three/RadiometricTerrain"));

type PlantRec = { note: string; plants: { en: string; ar: string; why: string }[] };

const SCAN_MS = 1100;
/** الموديل مدرَّب على هذه القنوات — بدونها لا تصنيف */
const REQUIRED: Channel[] = ["K", "U", "Th"];

interface Scan {
  status: "idle" | "scanning" | "done";
  cell: Cell | null;
  reading: GammaReading | null;
  prediction: Prediction | null;
}

/* ------------------------------------------------------------------ */

function Brief() {
  return (
    <ol className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {demo.brief.steps.map((s) => (
        <li key={s.n} className="rounded-[4px] bg-sand p-5">
          <span className="num display text-2xl font-extrabold text-gold">
            {s.n}
          </span>
          <h3 className="display mt-2 font-bold text-espresso">{s.title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">{s.desc}</p>
        </li>
      ))}
    </ol>
  );
}

function Reading({ r }: { r: GammaReading }) {
  const cells: [string, string, string][] = [
    ["K", r.K_pct.toFixed(2), "%"],
    ["U", r.U_ppm.toFixed(2), "ppm"],
    ["Th", r.Th_ppm.toFixed(2), "ppm"],
    ["العد الكلي", (r.total_count_nGy_h ?? 0).toFixed(0), "nGy/h"],
  ];
  return (
    <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
      {cells.map(([label, val, unit]) => (
        <div key={label}>
          <dt className="text-xs text-ink-soft">{label}</dt>
          <dd className="num display text-lg font-bold text-ink">
            {val} <span className="text-xs font-normal">{unit}</span>
          </dd>
        </div>
      ))}
    </dl>
  );
}

/* ------------------------------------------------------------------ */

export default function Demo() {
  const [grid, setGrid] = useState<Grid | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [channel, setChannel] = useState<Channel>("K");
  const [scan, setScan] = useState<Scan>({
    status: "idle", cell: null, reading: null, prediction: null,
  });
  const timer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    void ensureModel();
    loadGrid().then(setGrid).catch((e) => setErr(String(e)));
    return () => clearTimeout(timer.current);
  }, []);

  // القنوات المتاحة فعلاً في هذا التصدير
  const available = grid?.channels ?? [];
  const canPredict = REQUIRED.every((c) => available.includes(c));

  const runScan = (cell: Cell) => {
    if (!grid) return;
    clearTimeout(timer.current);
    setScan({ status: "scanning", cell, reading: null, prediction: null });

    timer.current = setTimeout(async () => {
      await ensureModel();

      const K = grid.at("K", cell.col, cell.row);
      const U = grid.at("U", cell.col, cell.row);
      const Th = grid.at("Th", cell.col, cell.row);

      if (!canPredict || [K, U, Th].some(Number.isNaN)) {
        // نعرض ما نملكه فعلاً ولا نلفّق الباقي
        const partial: GammaReading = {
          K_pct: K,
          U_ppm: U,
          Th_ppm: Th,
          Cs137_Bq_kg: 0,
          total_count_nGy_h: Number.isNaN(U) || Number.isNaN(Th)
            ? undefined
            : doseRate(K, U, Th),
        };
        setScan({ status: "done", cell, reading: partial, prediction: null });
        return;
      }

      const reading: GammaReading = {
        K_pct: K,
        U_ppm: U,
        Th_ppm: Th,
        // القناة السيزيومية غير متاحة في مسح USGS — نمرر خلفية قياسية،
        // والموديل يعطيها وزناً ضئيلاً أصلاً (ملوّث بشري لا معدني).
        Cs137_Bq_kg: 2,
        total_count_nGy_h: doseRate(K, U, Th),
      };
      setScan({
        status: "done", cell, reading, prediction: predict(reading),
      });
    }, SCAN_MS);
  };

  const rec: PlantRec | null = scan.prediction
    ? (plants as Record<string, PlantRec>)[scan.prediction.soil]
    : null;

  return (
    <div className="bg-paper pt-24">
      <div className="mx-auto max-w-6xl px-5 md:px-8">
        <SectionBadge>{demo.title}</SectionBadge>
        <p className="max-w-3xl text-xl leading-relaxed text-ink">{demo.lead}</p>

        {/* موجز المنهجية */}
        <section className="mt-12">
          <h2 className="display mb-5 text-lg font-bold text-espresso">
            {demo.brief.title}
          </h2>
          <Brief />
        </section>

        {/* شريط مصدر البيانات — الادعاء الأهم في الصفحة، فليكن صريحاً */}
        <div className="mt-10 flex flex-wrap items-center gap-3 rounded-[4px] border border-cream bg-sand px-5 py-4">
          <span className="display rounded-l-full rounded-r-[6px] bg-olive px-4 py-1 text-xs font-bold text-paper">
            {demo.views.real.badge}
          </span>
          <p className="text-sm text-ink">{demo.views.real.note}</p>
          {grid && (
            <span className="num ms-auto text-xs text-ink-soft">
              {grid.header.cols}×{grid.header.rows} خلية · {grid.header.cellKm} كم
            </span>
          )}
        </div>

        {!canPredict && grid && (
          <p className="mt-3 rounded-[4px] bg-wine/10 px-5 py-3 text-sm text-wine">
            التصدير الحالي يحوي القنوات: {available.join("، ")} — التصنيف يتطلب
            K و U و Th معاً. القراءات المعروضة حقيقية، لكن التصنيف معطّل حتى
            تكتمل القنوات.
          </p>
        )}
      </div>

      {/* الخريطة + النتيجة */}
      <div className="mx-auto mt-8 max-w-7xl px-5 md:px-8">
        <div className="grid gap-6 lg:grid-cols-[1.55fr_1fr]">
          {/* الخريطة ثلاثية الأبعاد */}
          <div>
            {/* مبدّل القناة */}
            <div className="mb-3 flex flex-wrap gap-2">
              {demo.channels
                .filter((c) => available.includes(c.id as Channel))
                .map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setChannel(c.id as Channel)}
                    aria-pressed={channel === c.id}
                    className={`display rounded-l-full rounded-r-[6px] px-4 py-1.5 text-sm font-bold transition-colors ${
                      channel === c.id
                        ? "bg-espresso text-paper"
                        : "bg-cream text-ink-soft hover:bg-beige-card"
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
            </div>

            <div className="relative h-[26rem] overflow-hidden rounded-[4px] bg-sand md:h-[34rem] lg:h-[38rem]">
              {err && (
                <div className="flex h-full items-center justify-center px-6 text-center">
                  <p className="text-sm text-wine">
                    تعذّر تحميل شبكة المسح: {err}
                  </p>
                </div>
              )}
              {!err && !grid && (
                <div className="flex h-full items-center justify-center">
                  <p className="text-ink-soft">…جارٍ تحميل شبكة المسح</p>
                </div>
              )}
              {grid && (
                <Suspense
                  fallback={
                    <div className="flex h-full items-center justify-center">
                      <p className="text-ink-soft">…جارٍ بناء التضاريس</p>
                    </div>
                  }
                >
                  <RadiometricTerrain
                    grid={grid}
                    channel={channel}
                    selected={scan.cell}
                    scanning={scan.status === "scanning"}
                    onPick={runScan}
                  />
                </Suspense>
              )}

              {grid && (
                <p className="pointer-events-none absolute bottom-3 start-4 text-xs text-ink-soft">
                  {demo.hint}
                </p>
              )}
            </div>

            {/* مفتاح الألوان */}
            {grid && (
              <div className="mt-3 flex items-center gap-3">
                <span className="text-xs text-ink-soft">منخفض</span>
                <div
                  className="h-2 flex-1 rounded-l-[3px]"
                  style={{
                    background:
                      "linear-gradient(to left, #ede3cf, #dcc9a3, #bfa06e, #5c5f3a, #4a2e35)",
                  }}
                />
                <span className="text-xs text-ink-soft">مرتفع</span>
              </div>
            )}
          </div>

          {/* لوحة النتيجة */}
          <aside
            className="min-h-[26rem] rounded-[4px] bg-sand p-6 md:p-7"
            aria-live="polite"
          >
            {scan.status === "idle" && (
              <div className="flex h-full min-h-[22rem] flex-col items-center justify-center gap-4 text-center">
                <RadiationIcon className="h-12 w-12 text-olive/45" />
                <p className="max-w-xs text-ink-soft">{demo.empty}</p>
              </div>
            )}

            {scan.status === "scanning" && (
              <div className="flex h-full min-h-[22rem] flex-col items-center justify-center gap-3 text-center">
                <p className="display text-xl font-bold text-espresso">
                  …جارٍ الفحص
                </p>
                <p className="text-sm text-ink-soft">{demo.scanning}</p>
              </div>
            )}

            {scan.status === "done" && scan.reading && scan.cell && (
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="num text-xs text-ink-soft">
                      {scan.cell.lat.toFixed(3)}°N ·{" "}
                      {Math.abs(scan.cell.lon).toFixed(3)}°W
                    </p>
                    {scan.prediction ? (
                      <p className="display mt-1 text-3xl font-extrabold text-espresso">
                        تربة {demo.soilNames[scan.prediction.soil]}
                      </p>
                    ) : (
                      <p className="display mt-1 text-xl font-bold text-ink-soft">
                        قراءة إشعاعية
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => scan.cell && runScan(scan.cell)}
                    className="shrink-0 text-sm text-olive underline decoration-2 underline-offset-4 transition-colors hover:text-espresso"
                  >
                    {demo.scanButton}
                  </button>
                </div>

                {scan.prediction && (
                  <div className="mt-5">
                    <ConfidenceBars probs={scan.prediction.probs} />
                  </div>
                )}

                <div className="mt-5 border-t border-cream pt-4">
                  <Reading r={scan.reading} />
                </div>

                {rec && (
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
                )}
              </div>
            )}
          </aside>
        </div>

        <p className="mt-6 pb-16 text-xs text-ink-soft">
          {grid?.header.source}
        </p>
      </div>
    </div>
  );
}
