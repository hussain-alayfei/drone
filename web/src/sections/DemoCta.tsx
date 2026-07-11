/**
 * الجسر من الصفحة التعريفية إلى التجربة الحية — يذكر مصدر البيانات صراحةً
 * لأن ذلك هو جوهر ما يميّز الديمو: قراءات مقيسة فعلاً، لا محاكاة.
 */
import { Link } from "react-router-dom";
import { demoCta } from "../data/content";
import { RadiationIcon } from "../components/icons";

export default function DemoCta() {
  return (
    <section className="bg-espresso py-16 md:py-20">
      <div className="mx-auto max-w-4xl px-5 text-center md:px-8">
        <RadiationIcon className="mx-auto h-10 w-10 text-gold" />

        <h2 className="display mt-5 text-3xl font-extrabold text-paper md:text-4xl">
          {demoCta.title}
        </h2>

        <p className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-cream">
          {demoCta.lead}
        </p>

        <Link
          to="/demo"
          className="display mt-8 inline-block rounded-l-full rounded-r-[6px] bg-gold px-10 py-3 font-bold text-espresso transition-colors hover:bg-gold-strong"
        >
          {demoCta.button}
        </Link>

        <p className="mt-5 text-sm text-cream/70">{demoCta.source}</p>
      </div>
    </section>
  );
}
