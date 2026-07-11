import SectionBadge from "../components/SectionBadge";
import { pricing } from "../data/content";
import { BulletIcon } from "../components/icons";

export default function Pricing() {
  return (
    <section id="pricing" className="bg-paper py-16 md:py-24">
      <div className="mx-auto max-w-6xl px-5 md:px-8">
        <SectionBadge>{pricing.title}</SectionBadge>

        <div className="grid gap-6 md:grid-cols-3">
          {pricing.tiers.map((t) => (
            <article
              key={t.name}
              className={`rounded-[4px] bg-beige-card p-7 ${
                t.highlight ? "border-2 border-gold-strong shadow-soft" : ""
              }`}
            >
              <h3 className="display text-xl font-bold text-espresso">{t.name}</h3>
              <p className="mt-4 flex items-baseline gap-2">
                <span className="num display text-4xl font-extrabold text-espresso md:text-5xl">
                  {t.price}
                </span>
                <span className="text-sm text-ink-soft">{t.unit}</span>
              </p>
              <ul className="mt-6 space-y-3">
                {t.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5">
                    <BulletIcon className="mt-0.5 h-4 w-4 shrink-0 text-olive" />
                    <span className="text-sm leading-relaxed text-ink">{f}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
