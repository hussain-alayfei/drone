import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { brand, nav } from "../data/content";
import { BulletIcon } from "./icons";

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const onHome = pathname === "/";

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const close = () => setOpen(false);

  /**
   * مراسي الأقسام تعيش في الصفحة التعريفية فقط — من /demo نعود للجذر أولاً
   * ثم نمرر للمرساة بعد أن يُركّب المحتوى.
   */
  const goToSection = (id: string) => {
    close();
    if (onHome) {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    } else {
      navigate("/");
      requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView());
    }
  };

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-colors duration-200 ${
        scrolled || open ? "bg-sand/95 shadow-soft backdrop-blur-none" : "bg-transparent"
      }`}
    >
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3 md:px-8">
        <Link to="/" className="flex items-center gap-2" onClick={close}>
          <BulletIcon className="h-7 w-7 text-espresso" />
          <span className="display text-2xl font-extrabold text-espresso">
            {brand.name}
          </span>
        </Link>

        <ul className="hidden items-center gap-6 lg:flex">
          {nav.links.map((l) => (
            <li key={l.id}>
              <button
                type="button"
                onClick={() => goToSection(l.id)}
                className="text-sm text-ink-soft transition-colors hover:text-olive"
              >
                {l.label}
              </button>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-3">
          <Link
            to="/demo"
            onClick={close}
            aria-current={pathname === "/demo" ? "page" : undefined}
            className="display hidden rounded-l-full rounded-r-[6px] bg-espresso px-6 py-2 text-sm font-bold text-paper transition-colors hover:bg-espresso-deep sm:block"
          >
            {nav.cta}
          </Link>
          <button
            type="button"
            aria-label={open ? "إغلاق القائمة" : "فتح القائمة"}
            aria-expanded={open}
            onClick={() => setOpen(!open)}
            className="flex h-11 w-11 items-center justify-center text-espresso lg:hidden"
          >
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              {open ? (
                <path d="M5 5 L19 19 M19 5 L5 19" />
              ) : (
                <path d="M4 7 H20 M4 12 H20 M4 17 H13" />
              )}
            </svg>
          </button>
        </div>
      </nav>

      {open && (
        <ul className="border-t border-cream bg-sand px-6 pb-6 pt-3 lg:hidden">
          {nav.links.map((l) => (
            <li key={l.id}>
              <button
                type="button"
                onClick={() => goToSection(l.id)}
                className="block w-full border-b border-cream py-3 text-right text-ink"
              >
                {l.label}
              </button>
            </li>
          ))}
          <li>
            <Link
              to="/demo"
              onClick={close}
              className="display mt-4 block rounded-l-full rounded-r-[6px] bg-espresso px-6 py-3 text-center font-bold text-paper"
            >
              {nav.cta}
            </Link>
          </li>
        </ul>
      )}
    </header>
  );
}
