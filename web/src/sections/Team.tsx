import SectionBadge from "../components/SectionBadge";
import { team } from "../data/content";

export default function Team() {
  return (
    <section id="team" className="bg-paper py-16 md:py-24">
      <div className="mx-auto max-w-6xl px-5 md:px-8">
        <SectionBadge>{team.title}</SectionBadge>

        <div className="grid gap-10 sm:grid-cols-3">
          {team.members.map((m) => (
            <div key={m.name} className="flex items-center gap-5 sm:block">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-beige-card sm:mb-5 sm:h-24 sm:w-24">
                <span className="display text-3xl font-extrabold text-espresso">
                  {m.name.charAt(0)}
                </span>
              </div>
              <div>
                <h3 className="display text-lg font-bold text-espresso">{m.name}</h3>
                <p className="mt-1.5 max-w-52 text-sm leading-relaxed text-ink-soft">
                  {m.role}
                </p>
              </div>
            </div>
          ))}
        </div>

        <p className="mt-12 border-t border-cream pt-6 text-sm text-ink-soft">
          {team.experience}
        </p>
      </div>
    </section>
  );
}
