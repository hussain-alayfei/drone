import {
  Suspense,
  lazy,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import SectionBadge from "../components/SectionBadge";
import LeaderLabel from "../components/LeaderLabel";
import { bullet3d } from "../data/content";

const BulletScene = lazy(() => import("../three/BulletScene"));

function webglAvailable(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

/** البديل الثابت — رسم مقطعي للرصاصة بنفس التسميات (لأجهزة بدون WebGL أو reduced motion) */
function StaticBullet() {
  return (
    <div className="grid items-center gap-10 md:grid-cols-[auto_1fr]">
      <svg
        viewBox="0 0 220 340"
        role="img"
        aria-label="مقطع الرصاصة الزراعية: القشرة، الطين، البذرة، ومحفزات النمو"
        className="mx-auto w-56 md:w-64"
      >
        <path
          d="M110 12 C160 70 182 122 182 190 A72 72 0 0 1 38 190 C38 122 60 70 110 12 Z"
          fill="#C8A97E"
          stroke="#3E2F26"
          strokeWidth="2.5"
        />
        {/* المقطع المكشوف */}
        <path
          d="M110 34 C148 82 164 128 164 190 A54 54 0 0 1 56 190 C56 128 72 82 110 34 Z"
          fill="#6B4F3A"
        />
        <ellipse cx="110" cy="196" rx="26" ry="34" fill="#8B5A3C" stroke="#3E2F26" strokeWidth="2" />
        {[
          [82, 120], [138, 128], [96, 158], [128, 170], [74, 190], [146, 200],
          [88, 232], [132, 240], [110, 120], [110, 262],
        ].map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="5" fill="#BFA06E" />
        ))}
        <path d="M110 300 c0 14 8 20 20 22" stroke="#4A7C3F" strokeWidth="5" fill="none" strokeLinecap="round" />
      </svg>
      <div className="grid gap-8 sm:grid-cols-2">
        {bullet3d.layers.map((l) => (
          <LeaderLabel key={l.id} title={l.name} desc={l.desc} />
        ))}
      </div>
    </div>
  );
}

export default function SeedBullet3D() {
  const [use3D, setUse3D] = useState(false);
  const [inView, setInView] = useState(false);
  const [labelsOn, setLabelsOn] = useState(false);
  const [journeyOn, setJourneyOn] = useState(false);
  const progressRef = useRef(0);
  const trackRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setUse3D(!reduced && webglAvailable());
  }, []);

  // تحميل المشهد فقط عند الاقتراب من القسم
  useEffect(() => {
    if (!use3D || !sectionRef.current) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { rootMargin: "600px" },
    );
    io.observe(sectionRef.current);
    return () => io.disconnect();
  }, [use3D]);

  // تقدّم السكرول داخل مسار القسم — بدون إعادة render لكل بكسل
  useEffect(() => {
    if (!use3D) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const el = trackRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const total = rect.height - window.innerHeight;
        const p = total > 0 ? Math.min(1, Math.max(0, -rect.top / total)) : 0;
        progressRef.current = p;
        setLabelsOn((prev) => {
          const next = p > 0.3 && p < 0.88;
          return prev === next ? prev : next;
        });
        setJourneyOn((prev) => {
          const next = p >= 0.88;
          return prev === next ? prev : next;
        });
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
    };
  }, [use3D]);

  const header = useMemo(
    () => (
      <div className="mx-auto max-w-6xl px-5 md:px-8">
        <SectionBadge>{bullet3d.title}</SectionBadge>
        <p className="max-w-3xl text-xl leading-relaxed text-ink">{bullet3d.lead}</p>
      </div>
    ),
    [],
  );

  if (!use3D) {
    return (
      <section id="bullet" ref={sectionRef} className="bg-sand py-16 md:py-24">
        {header}
        <div className="mx-auto mt-12 max-w-6xl px-5 md:px-8">
          <StaticBullet />
          <p className="mt-10 max-w-2xl text-base leading-relaxed text-ink-soft">
            {bullet3d.journey}
          </p>
        </div>
      </section>
    );
  }

  const [shell, clay, seed, boost] = bullet3d.layers;

  return (
    <section id="bullet" ref={sectionRef} className="bg-sand pt-16 md:pt-24">
      {header}

      {/* مسار السكرول: 280vh — الكانفاس مثبّت طول الرحلة */}
      <div ref={trackRef} className="relative mt-8 h-[280vh]">
        <div className="sticky top-0 flex h-screen items-center justify-center overflow-hidden">
          <div className="relative h-full w-full max-w-5xl">
            <Suspense
              fallback={
                <div className="flex h-full items-center justify-center">
                  <p className="text-ink-soft">جارٍ تجهيز المشهد…</p>
                </div>
              }
            >
              {inView && <BulletScene progressRef={progressRef} />}
            </Suspense>

            {/* تسميات الطبقات — تظهر أثناء التفكيك */}
            <div
              className={`pointer-events-none absolute inset-0 transition-opacity duration-500 ${
                labelsOn ? "opacity-100" : "opacity-0"
              }`}
              aria-hidden={!labelsOn}
            >
              <div className="absolute right-4 top-[16%] md:right-10 md:top-[22%]">
                <LeaderLabel title={shell.name} desc={shell.desc} />
              </div>
              <div className="absolute bottom-[18%] right-4 md:bottom-[24%] md:right-10">
                <LeaderLabel title={clay.name} desc={clay.desc} />
              </div>
              <div className="absolute left-4 top-[16%] md:left-10 md:top-[22%]">
                <LeaderLabel title={seed.name} desc={seed.desc} align="end" />
              </div>
              <div className="absolute bottom-[18%] left-4 md:bottom-[24%] md:left-10">
                <LeaderLabel title={boost.name} desc={boost.desc} align="end" />
              </div>
            </div>

            {/* سطر الرحلة — يظهر عند الغرس */}
            <p
              className={`absolute inset-x-6 bottom-10 mx-auto max-w-xl text-center text-base leading-relaxed text-ink transition-opacity duration-500 md:text-lg ${
                journeyOn ? "opacity-100" : "opacity-0"
              }`}
              aria-hidden={!journeyOn}
            >
              {bullet3d.journey}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
