import SectionBadge from "../components/SectionBadge";
import { brand, science } from "../data/content";

/**
 * أشرطة أفقية RTL أحادية السلسلة: القاعدة يمين والشريط يمتد يساراً،
 * نهاية البيانات مستديرة 4px، تسمية مباشرة لكل شريط (الهوية ليست باللون وحده)،
 * والقيم بحبر النص لا بلون السلسلة — وفق منهجية dataviz.
 */
function BarRow({
  label,
  value,
  max,
  color,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
}) {
  const pct = (value / max) * 100;
  return (
    <div
      className="group grid grid-cols-[7.5rem_1fr_3.2rem] items-center gap-3 py-1.5"
      role="listitem"
      aria-label={`${label}: ${Math.round(value * 100)}%`}
    >
      <span className="text-sm text-ink">{label}</span>
      <div className="h-4 overflow-hidden rounded-l-[4px] bg-espresso/8">
        <div
          className={`h-full rounded-l-[4px] ${color} transition-opacity group-hover:opacity-80`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="num display text-sm font-bold text-ink">
        {Math.round(value * 100)}%
      </span>
    </div>
  );
}

export default function Science() {
  const f1Max = 1;
  const sigMax = Math.max(...science.signals.map((s) => s.value)) * 1.15;

  return (
    <section id="science" className="bg-paper py-16 md:py-24">
      <div className="mx-auto max-w-6xl px-5 md:px-8">
        <SectionBadge>{science.title}</SectionBadge>

        <p className="max-w-3xl text-xl leading-relaxed text-ink">{science.lead}</p>

        <div className="mt-12 grid gap-12 lg:grid-cols-2 lg:gap-16">
          <figure>
            <figcaption className="display mb-4 font-bold text-espresso">
              دقة التصنيف لكل نوع تربة (F1)
            </figcaption>
            <div role="list">
              {science.f1PerClass.map((row) => (
                <BarRow
                  key={row.en}
                  label={row.soil}
                  value={row.value}
                  max={f1Max}
                  color="bg-olive"
                />
              ))}
            </div>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-ink-soft">
              {science.overallNote}
            </p>
          </figure>

          <figure>
            <figcaption className="display mb-4 font-bold text-espresso">
              أهم الإشارات في القرار
            </figcaption>
            <div role="list">
              {science.signals.map((row) => (
                <BarRow
                  key={row.name}
                  label={row.name}
                  value={row.value}
                  max={sigMax}
                  color="bg-wine"
                />
              ))}
            </div>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-ink-soft">
              {science.signalsNote}
            </p>
          </figure>
        </div>

        <div className="mt-14 flex flex-col gap-4 border-r-0 bg-sand p-6 md:flex-row md:items-center md:justify-between">
          <p className="max-w-2xl text-sm leading-relaxed text-ink">
            {science.upgradeNote}
          </p>
          <div className="flex shrink-0 flex-wrap gap-5">
            <a
              href={brand.github}
              target="_blank"
              rel="noopener noreferrer"
              className="text-olive underline decoration-2 underline-offset-4 transition-colors hover:text-espresso"
            >
              الكود على GitHub
            </a>
            <a
              href={brand.paper.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-olive underline decoration-2 underline-offset-4 transition-colors hover:text-espresso"
            >
              الورقة العلمية
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
