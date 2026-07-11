import SectionBadge from "../components/SectionBadge";
import { problem } from "../data/content";

/** نسيج تشققات التربة — خطوط SVG خفيفة، وليس صورة ستوك */
function CrackPattern() {
  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.09]"
      preserveAspectRatio="xMidYMid slice"
      viewBox="0 0 800 600"
    >
      <g fill="none" stroke="#3E2F26" strokeWidth="1.5" strokeLinecap="round">
        <path d="M40 80 L160 120 L150 240 L60 300 M160 120 L300 90 L340 210 L150 240 M340 210 L470 250 L430 380 L280 350 L340 210 M470 250 L620 190 L700 300 L580 400 L430 380 M300 90 L430 40 L620 70 L620 190 M60 300 L120 450 L280 350 M120 450 L260 540 L430 500 L430 380 M620 400 L700 520 L520 560 L430 500 M700 300 L780 340 M620 70 L740 120 L700 300" />
      </g>
    </svg>
  );
}

export default function Problem() {
  return (
    <section id="problem" className="relative overflow-hidden bg-cream py-16 md:py-24">
      <CrackPattern />
      <div className="relative mx-auto max-w-6xl px-5 md:px-8">
        <SectionBadge>{problem.title}</SectionBadge>

        <p className="max-w-2xl text-xl leading-relaxed text-ink md:text-2xl">
          {problem.lead}
        </p>

        {/* أرقام مدموجة بالسرد بأحجام وإزاحات متفاوتة — ليست صف إحصائيات */}
        <div className="mt-14 space-y-12 md:space-y-16">
          <div className="flex flex-col items-start gap-2 md:flex-row md:items-baseline md:gap-8">
            <span className="num display text-7xl font-extrabold text-gold-strong md:text-9xl">
              {problem.stats[0].value}
            </span>
            <p className="max-w-md text-lg leading-relaxed text-ink md:text-xl">
              {problem.stats[0].text}
            </p>
          </div>

          <div className="flex flex-col items-start gap-2 md:mr-[18%] md:flex-row md:items-baseline md:gap-8">
            <span className="num display text-6xl font-extrabold text-wine md:text-8xl">
              {problem.stats[1].value}
            </span>
            <p className="max-w-md text-lg leading-relaxed text-ink">
              {problem.stats[1].text}
            </p>
          </div>

          <div className="flex flex-col items-start gap-2 md:mr-[7%] md:flex-row md:items-baseline md:gap-8">
            <span className="num display text-6xl font-extrabold text-olive md:text-8xl">
              {problem.stats[2].value}
            </span>
            <p className="max-w-md text-lg leading-relaxed text-ink">
              {problem.stats[2].text}
            </p>
          </div>

          <div className="flex flex-col items-start gap-2 md:mr-[28%] md:flex-row md:items-baseline md:gap-8">
            <span className="num display text-5xl font-extrabold text-espresso md:text-7xl">
              {problem.stats[3].value}
            </span>
            <p className="max-w-md text-lg leading-relaxed text-ink">
              {problem.stats[3].text}
            </p>
          </div>
        </div>

        <p className="mt-14 text-xs text-ink-soft">{problem.source}</p>
      </div>
    </section>
  );
}
