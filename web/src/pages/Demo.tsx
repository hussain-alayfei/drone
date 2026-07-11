/**
 * التجربة الحية — منفصلة عن الصفحة التعريفية عمداً: منهجية وبيانات ونتيجة.
 *
 * عرضان، والفرق بينهما مُصرَّح به في الواجهة لا مدفون:
 *  - غرب الولايات المتحدة: شبكة USGS الحقيقية كتضاريس 3D — كل قراءة مقيسة.
 *  - المملكة: إسقاط تقديري يوضح شكل النشر المستهدف (لا مسح مفتوح للسعودية).
 * الموديل واحد في الحالتين؛ مصدر القراءة هو المختلف.
 */
import { Suspense, lazy, useEffect, useRef, useState } from "react";
import SectionBadge from "../components/SectionBadge";
import ConfidenceBars from "../components/ConfidenceBars";
import SaudiMap from "../components/SaudiMap";
import { LeafIcon, RadiationIcon } from "../components/icons";
import { demo } from "../data/content";
import { loadGrid, type Channel, type Grid } from "../data/grid";
import { regionGeology, sampleReading } from "../data/regions";
import { regionShapes } from "../data/saudi-map";
import {
  doseRate,
  ensureModel,
  modelMetrics,
  predict,
  type GammaReading,
  type ModelMetrics,
  type Prediction,
} from "../model/predict";
import plants from "../model/plants.json";
import type { Cell } from "../three/RadiometricTerrain";

const RadiometricTerrain = lazy(() => import("../three/RadiometricTerrain"));

type PlantRec = { note: string; plants: { en: string; ar: string; why: string }[] };
type ViewId = "real" | "saudi";

const SCAN_MS = 1100;

/** ما فُحص: خلية أمريكية مقيسة أو منطقة سعودية مُسقطة */
type Target =
  | { kind: "cell"; cell: Cell }
  | { kind: "region"; regionId: string };

interface Scan {
  status: "idle" | "scanning" | "done" | "nodata";
  target: Target | null;
  reading: GammaReading | null;
  prediction: Prediction | null;
}

const IDLE: Scan = { status: "idle", target: null, reading: null, prediction: null };

/* ------------------------------------------------------------------ */

function Brief() {
  return (
    <ol className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {demo.brief.steps.map((s) => (
        <li key={s.n} className="rounded-[4px] bg-sand p-5">
          <span className="num display text-2xl font-extrabold text-gold">{s.n}</span>
          <h3 className="display mt-2 font-bold text-espresso">{s.title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">{s.desc}</p>
        </li>
      ))}
    </ol>
  );
}

function Reading({ r }: { r: GammaReading }) {
  const tc = doseRate(r.K, r.U, r.Th);
  const cells: [string, string, string][] = [
    ["K", r.K.toFixed(2), "%"],
    ["U", r.U.toFixed(2), "ppm"],
    ["Th", r.Th.toFixed(2), "ppm"],
    ["العد الكلي", tc.toFixed(0), "nGy/h"],
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

/** نسب الطين/الرمل/الطمي المتوقعة — مخرج الانحدار نفسه */
function Fractions({ p }: { p: Prediction }) {
  const rows: [string, number, string][] = [
    [demo.fractions.clay, p.clay, "bg-wine"],
    [demo.fractions.sand, p.sand, "bg-gold"],
    [demo.fractions.silt, p.silt, "bg-olive"],
  ];
  return (
    <div>
      <p className="mb-2 text-xs text-ink-soft">{demo.fractions.title}</p>
      <div className="flex h-4 w-full overflow-hidden rounded-[4px]">
        {rows.map(([label, v, cls]) => (
          <div
            key={label}
            className={cls}
            style={{ width: `${Math.max(v, 1)}%` }}
            title={`${label} ${v.toFixed(0)}%`}
          />
        ))}
      </div>
      <div className="mt-2 flex gap-4">
        {rows.map(([label, v, cls]) => (
          <span key={label} className="flex items-center gap-1.5 text-xs text-ink">
            <span className={`inline-block h-2.5 w-2.5 rounded-[2px] ${cls}`} />
            {label} <strong className="num">{v.toFixed(0)}%</strong>
          </span>
        ))}
      </div>
    </div>
  );
}

/** أداء الموديل الفعلي — مقروء من ملف الموديل نفسه، لا من نص مكتوب يدوياً */
function MetricsPanel({ m }: { m: ModelMetrics }) {
  const rows = [
    {
      label: demo.metricsPanel.interp,
      acc: m.interp.class_accuracy,
      r2: m.interp.clay_r2,
      mae: m.interp.clay_mae,
      strong: true,
    },
    {
      label: demo.metricsPanel.extrap,
      acc: m.extrap.class_accuracy,
      r2: m.extrap.clay_r2,
      mae: m.extrap.clay_mae,
      strong: false,
    },
  ];
  return (
    <section className="mt-14 rounded-[4px] bg-espresso p-6 md:p-8">
      <h2 className="display text-xl font-bold text-paper">
        {demo.metricsPanel.title}
      </h2>
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {rows.map((r) => (
          <div key={r.label} className="rounded-[4px] bg-espresso-deep p-5">
            <p className="text-sm leading-relaxed text-cream">{r.label}</p>
            <div className="mt-3 flex flex-wrap items-baseline gap-x-6 gap-y-2">
              <div>
                <span className={`num display text-3xl font-extrabold ${r.strong ? "text-gold" : "text-cream/70"}`}>
                  {(r.acc * 100).toFixed(1)}%
                </span>
                <span className="ms-2 text-xs text-cream/70">{demo.metricsPanel.accuracy}</span>
              </div>
              <div className="text-xs text-cream/70">
                {demo.metricsPanel.clayR2}: <span className="num">{r.r2.toFixed(2)}</span>
                {" · "}
                {demo.metricsPanel.clayMae}: <span className="num">±{r.mae.toFixed(1)}</span> نقطة
              </div>
            </div>
          </div>
        ))}
      </div>
      <p className="mt-4 text-sm leading-relaxed text-cream/85">
        {demo.metricsPanel.note}
      </p>
      <p className="num mt-3 text-xs text-cream/60">
        {demo.metricsPanel.baseline}: {(m.majority_baseline * 100).toFixed(1)}% ·{" "}
        {m.n_train.toLocaleString("en")} {demo.metricsPanel.trainedOn}
      </p>
    </section>
  );
}

/* ------------------------------------------------------------------ */

export default function Demo() {
  const [grid, setGrid] = useState<Grid | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [view, setView] = useState<ViewId>("real");
  const [channel, setChannel] = useState<Channel>("K");
  const [metrics, setMetrics] = useState<ModelMetrics | null>(null);
  const [scan, setScan] = useState<Scan>(IDLE);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    void ensureModel().then(() => setMetrics(modelMetrics()));
    loadGrid().then(setGrid).catch((e) => setErr(String(e)));
    return () => clearTimeout(timer.current);
  }, []);

  const switchView = (v: ViewId) => {
    clearTimeout(timer.current);
    setView(v);
    setScan(IDLE);
  };

  /** فحص خلية أمريكية — القراءة تُقرأ من الشبكة المقيسة */
  const scanCell = (cell: Cell) => {
    if (!grid) return;
    clearTimeout(timer.current);

    const K = grid.at("K", cell.col, cell.row);
    const U = grid.at("U", cell.col, cell.row);
    const Th = grid.at("Th", cell.col, cell.row);

    // خلية بلا قياس (خارج نطاق المسح) — نقولها بوضوح ولا نعرض NaN
    if ([K, U, Th].some(Number.isNaN)) {
      setScan({ status: "nodata", target: { kind: "cell", cell }, reading: null, prediction: null });
      return;
    }

    setScan({ status: "scanning", target: { kind: "cell", cell }, reading: null, prediction: null });
    timer.current = setTimeout(async () => {
      await ensureModel();
      const reading: GammaReading = { K, U, Th };
      setScan({
        status: "done",
        target: { kind: "cell", cell },
        reading,
        prediction: predict(reading),
      });
    }, SCAN_MS);
  };

  /** فحص منطقة سعودية — قراءة مُسقطة من جيولوجيا المنطقة، والموديل نفسه */
  const scanRegion = (regionId: string) => {
    clearTimeout(timer.current);
    setScan({ status: "scanning", target: { kind: "region", regionId }, reading: null, prediction: null });
    timer.current = setTimeout(async () => {
      await ensureModel();
      const reading = sampleReading(regionId);
      setScan({
        status: "done",
        target: { kind: "region", regionId },
        reading,
        prediction: predict(reading),
      });
    }, SCAN_MS);
  };

  const rescan = () => {
    if (!scan.target) return;
    if (scan.target.kind === "cell") scanCell(scan.target.cell);
    else scanRegion(scan.target.regionId);
  };

  const rec: PlantRec | null = scan.prediction
    ? (plants as Record<string, PlantRec>)[scan.prediction.soil]
    : null;

  const activeView = demo.views[view];
  const region =
    scan.target?.kind === "region"
      ? regionShapes.find((r) => r.id === (scan.target as { regionId: string }).regionId)
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
      </div>

      {/* الخريطة + النتيجة */}
      <div className="mx-auto mt-10 max-w-7xl px-5 md:px-8">
        {/* مبدّل العرض + شريط المصدر */}
        <div className="flex flex-wrap items-center gap-3 rounded-t-[4px] border border-b-0 border-cream bg-sand px-5 py-4">
          <div className="flex overflow-hidden rounded-l-full rounded-r-[6px] border border-espresso">
            {(Object.keys(demo.views) as ViewId[]).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => switchView(v)}
                aria-pressed={view === v}
                className={`display px-5 py-1.5 text-sm font-bold transition-colors ${
                  view === v
                    ? "bg-espresso text-paper"
                    : "bg-transparent text-espresso hover:bg-cream"
                }`}
              >
                {demo.views[v].label}
              </button>
            ))}
          </div>
          <span
            className={`display rounded-l-full rounded-r-[6px] px-4 py-1 text-xs font-bold text-paper ${
              view === "real" ? "bg-olive" : "bg-wine"
            }`}
          >
            {activeView.badge}
          </span>
          <p className="min-w-48 flex-1 text-sm text-ink">{activeView.note}</p>
          {view === "real" && grid && (
            <span className="num text-xs text-ink-soft">
              {grid.header.cols}×{grid.header.rows} خلية · {grid.header.cellKm} كم
            </span>
          )}
        </div>

        <div className="grid gap-6 rounded-b-[4px] border border-t-0 border-cream p-5 lg:grid-cols-[1.55fr_1fr] lg:p-6">
          {/* ---- الخريطة ---- */}
          <div>
            {view === "real" && (
              <>
                <div className="mb-3 flex flex-wrap gap-2">
                  {demo.channels
                    .filter((c) => grid?.channels.includes(c.id as Channel))
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
                      <p className="text-sm text-wine">تعذّر تحميل شبكة المسح: {err}</p>
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
                        selected={scan.target?.kind === "cell" ? scan.target.cell : null}
                        scanning={scan.status === "scanning"}
                        onPick={scanCell}
                      />
                    </Suspense>
                  )}
                  {grid && (
                    <p className="pointer-events-none absolute bottom-3 start-4 text-xs text-ink-soft">
                      {demo.hint}
                    </p>
                  )}
                </div>

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
              </>
            )}

            {view === "saudi" && (
              <div className="rounded-[4px] bg-sand p-4 md:p-6">
                <SaudiMap
                  selected={
                    scan.target?.kind === "region" ? scan.target.regionId : null
                  }
                  scanning={scan.status === "scanning"}
                  onSelect={scanRegion}
                />
                <p className="mt-3 text-center text-sm text-ink-soft">
                  {region
                    ? `المنطقة المختارة: ${region.ar}`
                    : "اختر منطقة من الخريطة"}
                </p>
              </div>
            )}
          </div>

          {/* ---- لوحة النتيجة ---- */}
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

            {scan.status === "nodata" && (
              <div className="flex h-full min-h-[22rem] flex-col items-center justify-center gap-4 text-center">
                <RadiationIcon className="h-12 w-12 text-wine/40" />
                <p className="max-w-xs leading-relaxed text-ink-soft">{demo.noData}</p>
              </div>
            )}

            {scan.status === "scanning" && (
              <div className="flex h-full min-h-[22rem] flex-col items-center justify-center gap-3 text-center">
                <p className="display text-xl font-bold text-espresso">…جارٍ الفحص</p>
                <p className="text-sm text-ink-soft">{demo.scanning}</p>
              </div>
            )}

            {scan.status === "done" && scan.reading && scan.prediction && (
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    {scan.target?.kind === "cell" && (
                      <p className="num text-xs text-ink-soft">
                        {scan.target.cell.lat.toFixed(3)}°N ·{" "}
                        {Math.abs(scan.target.cell.lon).toFixed(3)}°W
                      </p>
                    )}
                    {scan.target?.kind === "region" && region && (
                      <p className="text-xs text-ink-soft">
                        {region.ar} — {regionGeology[region.id]?.hint}
                      </p>
                    )}
                    <p className="display mt-1 text-3xl font-extrabold text-espresso">
                      تربة {demo.soilNames[scan.prediction.soil]}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={rescan}
                    className="shrink-0 text-sm text-olive underline decoration-2 underline-offset-4 transition-colors hover:text-espresso"
                  >
                    {demo.scanButton}
                  </button>
                </div>

                <div className="mt-5">
                  <Fractions p={scan.prediction} />
                </div>

                <div className="mt-5 border-t border-cream pt-4">
                  <p className="mb-2 text-xs text-ink-soft">
                    {demo.fractions.agreement}
                  </p>
                  <ConfidenceBars probs={scan.prediction.probs} />
                </div>

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

        {/* أداء الموديل */}
        {metrics && (
          <div className="mx-auto max-w-6xl">
            <MetricsPanel m={metrics} />
          </div>
        )}

        <p className="mt-6 pb-16 text-xs text-ink-soft">{grid?.header.source}</p>
      </div>
    </div>
  );
}
