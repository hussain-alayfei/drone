import SectionBadge from "../components/SectionBadge";
import { competitors } from "../data/content";

export default function Competitors() {
  return (
    <section id="competitors" className="bg-sand py-16 md:py-24">
      <div className="mx-auto max-w-6xl px-5 md:px-8">
        <SectionBadge>{competitors.title}</SectionBadge>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse text-sm">
            <thead>
              <tr className="bg-wine text-paper">
                {competitors.columns.map((c, i) => (
                  <th
                    key={i}
                    scope="col"
                    className={`display px-4 py-3.5 text-right font-bold ${
                      i === 1 ? "bg-espresso" : ""
                    }`}
                  >
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {competitors.rows.map((r) => (
                <tr key={r.label} className="border-b border-cream bg-paper">
                  <th
                    scope="row"
                    className="display px-4 py-4 text-right font-bold text-espresso"
                  >
                    {r.label}
                  </th>
                  <td
                    className={`px-4 py-4 ${
                      r.ainWins ? "bg-cream font-bold text-leaf" : "bg-cream text-ink"
                    }`}
                  >
                    {r.ain}
                  </td>
                  <td className="px-4 py-4 text-ink-soft">{r.dendra}</td>
                  <td className="px-4 py-4 text-ink-soft">{r.flash}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
