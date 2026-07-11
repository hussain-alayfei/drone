import SectionBadge from "../components/SectionBadge";
import { pipeline } from "../data/content";
import {
  DropletIcon,
  LeafIcon,
  MineralIcon,
  RadiationIcon,
  SoilLayersIcon,
} from "../components/icons";

const stepIcons = [RadiationIcon, MineralIcon, DropletIcon, SoilLayersIcon, LeafIcon];

export default function Pipeline() {
  return (
    <section id="pipeline" className="bg-sand py-16 md:py-24">
      <div className="mx-auto max-w-6xl px-5 md:px-8">
        <SectionBadge>{pipeline.title}</SectionBadge>

        {/* وسم المرحلة الحسّية (يمين) — نمط سلايد الـ pipeline */}
        <p className="display mb-10 inline-block bg-beige-card px-4 py-1.5 text-sm font-bold text-espresso">
          {pipeline.sensorLabel}
        </p>

        <ol className="relative">
          {/* الخط الواصل: أفقي على الشاشات الكبيرة، عمودي على الموبايل */}
          <div
            aria-hidden
            className="absolute right-6 top-0 h-full w-0.5 bg-wine/30 lg:right-0 lg:top-6 lg:h-0.5 lg:w-full"
          />
          <div className="grid gap-10 lg:grid-cols-5 lg:gap-4">
            {pipeline.steps.map((s, i) => {
              const Icon = stepIcons[i];
              return (
                <li key={s.n} className="relative flex gap-5 lg:block">
                  <div className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-4 border-sand bg-wine">
                    <span className="num display text-sm font-bold text-paper">
                      {s.n}
                    </span>
                  </div>
                  <div className="lg:mt-5">
                    <Icon className="mb-3 hidden h-8 w-8 text-olive lg:block" />
                    <h3 className="display text-base font-bold text-espresso">
                      {s.title}
                    </h3>
                    <p className="mt-1.5 max-w-xs text-sm leading-relaxed text-ink-soft">
                      {s.desc}
                    </p>
                  </div>
                </li>
              );
            })}
          </div>
        </ol>

        {/* وسم مرحلة الذكاء الاصطناعي (يسار) */}
        <div className="mt-10 flex justify-end">
          <p className="display inline-block bg-espresso px-4 py-1.5 text-sm font-bold text-paper">
            {pipeline.aiLabel}
          </p>
        </div>
      </div>
    </section>
  );
}
