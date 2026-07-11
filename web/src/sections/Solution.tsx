import SectionBadge from "../components/SectionBadge";
import { solution } from "../data/content";
import { BulletIcon, ChipIcon, DroneIcon, SensorIcon } from "../components/icons";

const icons = {
  drone: DroneIcon,
  sensor: SensorIcon,
  model: ChipIcon,
  bullet: BulletIcon,
} as const;

export default function Solution() {
  return (
    <section id="solution" className="bg-paper py-16 md:py-24">
      <div className="mx-auto max-w-6xl px-5 md:px-8">
        <SectionBadge>{solution.title}</SectionBadge>

        <p className="max-w-3xl text-xl leading-relaxed text-ink md:text-2xl">
          {solution.lead}
        </p>

        {/* مكونات المنظومة — عُقد متصلة بخط منقّط (نمط العرض)، ليست بطاقات */}
        <div className="relative mt-16">
          {/* الخط الواصل */}
          <div
            aria-hidden
            className="absolute right-8 top-8 hidden h-px w-[calc(100%-4rem)] border-t-2 border-dashed border-wine/40 md:block"
          />
          <div
            aria-hidden
            className="absolute right-8 top-8 block h-[calc(100%-4rem)] border-r-2 border-dashed border-wine/40 md:hidden"
          />

          <ol className="grid gap-10 md:grid-cols-4 md:gap-6">
            {solution.components.map((c) => {
              const Icon = icons[c.id as keyof typeof icons];
              return (
                <li key={c.id} className="relative flex items-start gap-5 md:block">
                  <div className="relative z-10 flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-beige-card">
                    <Icon className="h-8 w-8 text-espresso" />
                  </div>
                  <div className="md:mt-5">
                    <h3 className="display text-lg font-bold text-espresso">
                      {c.name}
                    </h3>
                    <p className="mt-2 max-w-xs text-sm leading-relaxed text-ink-soft">
                      {c.desc}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </section>
  );
}
