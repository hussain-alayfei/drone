import { brand, footer, nav } from "../data/content";
import { BulletIcon } from "./icons";
import WavePattern from "./WavePattern";

export default function Footer() {
  return (
    <footer className="bg-espresso-deep text-cream">
      <WavePattern tone="dark" className="h-16 md:h-24" />
      <div className="mx-auto grid max-w-6xl gap-10 px-5 pb-10 pt-4 md:grid-cols-3 md:px-8">
        <div>
          <div className="flex items-center gap-2">
            <BulletIcon className="h-8 w-8 text-gold" />
            <span className="display text-3xl font-extrabold text-paper">
              {brand.name}
            </span>
          </div>
          <p className="mt-3 max-w-xs leading-relaxed text-cream/80">
            {brand.tagline}
          </p>
        </div>

        <nav aria-label="روابط الموقع">
          <h3 className="display mb-4 font-bold text-gold">الأقسام</h3>
          <ul className="grid grid-cols-2 gap-2">
            {nav.links.map((l) => (
              <li key={l.id}>
                <a
                  href={`#${l.id}`}
                  className="text-sm text-cream/80 transition-colors hover:text-paper"
                >
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <h3 className="display mb-4 font-bold text-gold">المشروع</h3>
          <ul className="space-y-2 text-sm">
            <li>
              <a
                href={brand.github}
                target="_blank"
                rel="noopener noreferrer"
                className="text-cream/80 transition-colors hover:text-paper"
              >
                الكود مفتوح المصدر — GitHub
              </a>
            </li>
            <li>
              <a
                href={brand.paper.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-cream/80 transition-colors hover:text-paper"
              >
                الورقة العلمية — Springer
              </a>
            </li>
          </ul>
          <p className="mt-6 text-xs text-cream/60">{footer.line}</p>
        </div>
      </div>
      <div className="border-t border-paper/10 py-4 text-center text-xs text-cream/50">
        {footer.rights} © {new Date().getFullYear()}
      </div>
    </footer>
  );
}
