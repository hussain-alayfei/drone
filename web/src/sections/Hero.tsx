import { brand } from "../data/content";
import WavePattern from "../components/WavePattern";

/**
 * مشهد صحراوي مرسوم يدوياً بألوان الهوية — درون يمسح الأرض ويطلق رصاصة
 * زراعية — داخل إطار دائري منقّط (نمط العرض التقديمي). ليس صورة ستوك.
 */
function DesertScene() {
  return (
    <svg
      viewBox="0 0 420 420"
      role="img"
      aria-label="درون يمسح تربة صحراوية ويطلق رصاصة زراعية"
      className="w-full max-w-md"
    >
      {/* الإطار المنقّط — موتيف الدوائر في العرض */}
      <circle
        cx="210"
        cy="210"
        r="204"
        fill="none"
        stroke="#4A2E35"
        strokeWidth="2"
        strokeDasharray="3 10"
        strokeLinecap="round"
      />
      <clipPath id="scene">
        <circle cx="210" cy="210" r="188" />
      </clipPath>

      <g clipPath="url(#scene)">
        {/* سماء رملية فاتحة */}
        <rect x="0" y="0" width="420" height="420" fill="#F7F2E8" />
        {/* شمس */}
        <circle cx="128" cy="120" r="38" fill="#BFA06E" opacity="0.55" />

        {/* كثبان متدرجة */}
        <path
          d="M-10 268 C 70 238, 150 292, 240 262 S 400 246, 440 272 L 440 430 L -10 430 Z"
          fill="#DCC9A3"
        />
        <path
          d="M-10 306 C 90 282, 190 330, 300 300 S 420 292, 440 306 L 440 430 L -10 430 Z"
          fill="#BFA06E"
          opacity="0.75"
        />
        <path
          d="M-10 352 C 110 330, 230 372, 340 348 S 430 342, 440 350 L 440 430 L -10 430 Z"
          fill="#3E2F26"
          opacity="0.92"
        />

        {/* شجيرات صحراوية صغيرة */}
        <g stroke="#5C5F3A" strokeWidth="2" strokeLinecap="round" fill="none">
          <path d="M96 302 v-12 m0 4 l-7 -8 m7 8 l7 -9" />
          <path d="M312 288 v-10 m0 3 l-6 -7 m6 7 l6 -7" />
        </g>

        {/* الدرون */}
        <g fill="#2A211B">
          <rect x="182" y="118" width="56" height="18" rx="6" />
          <rect x="196" y="136" width="28" height="8" rx="3" />
          <g stroke="#2A211B" strokeWidth="4" strokeLinecap="round">
            <path d="M186 122 L156 100 M234 122 L264 100" />
          </g>
          <g stroke="#2A211B" strokeWidth="3" strokeLinecap="round">
            <path d="M138 98 H174 M246 98 H282" />
          </g>
          <circle cx="156" cy="98" r="4" />
          <circle cx="264" cy="98" r="4" />
        </g>

        {/* شعاع المسح المنقّط */}
        <g stroke="#A98D5F" strokeWidth="2" strokeDasharray="2 7" strokeLinecap="round">
          <path d="M198 148 L164 268" />
          <path d="M222 148 L256 268" />
        </g>
        <ellipse cx="210" cy="272" rx="52" ry="10" fill="none" stroke="#A98D5F" strokeWidth="2" strokeDasharray="2 7" />

        {/* الرصاصة الزراعية تهبط */}
        <g transform="translate(210 210) rotate(180)">
          <path
            d="M0 -26 C 8 -16, 11 -7, 11 2 A 11 11 0 0 1 -11 2 C -11 -7, -8 -16, 0 -26 Z"
            fill="#C8A97E"
            stroke="#3E2F26"
            strokeWidth="1.5"
          />
          <ellipse cx="0" cy="2" rx="4.5" ry="5.5" fill="#3E2F26" />
        </g>

        {/* نبتة أنبتتها رصاصة سابقة */}
        <g stroke="#4A7C3F" strokeWidth="2.5" strokeLinecap="round" fill="none">
          <path d="M150 296 c 0 -10 0 -14 2 -20" />
          <path d="M152 284 c -8 -2 -11 -8 -12 -14 c 8 0 12 5 12 14 Z" fill="#4A7C3F" />
          <path d="M152 278 c 7 -3 9 -8 9 -13 c -7 1 -10 6 -9 13 Z" fill="#4A7C3F" />
        </g>
      </g>
    </svg>
  );
}

export default function Hero() {
  return (
    <section id="top" className="relative overflow-hidden bg-paper pt-24 md:pt-28">
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 pb-8 md:grid-cols-[1.1fr_0.9fr] md:px-8 md:pb-16">
        <div>
          <p className="display mb-4 text-lg font-bold text-olive">
            {brand.name} — تحليل التربة من الجو
          </p>
          <h1 className="display text-4xl font-extrabold leading-snug text-espresso md:text-6xl md:leading-snug">
            نُحيي الأرض…
            <br />
            <span className="text-gold-strong">ببذرة</span> و
            <span className="text-leaf">ذَكاء</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-soft">
            {brand.intro}
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-6">
            <a
              href="#demo"
              className="display rounded-l-full rounded-r-[6px] bg-espresso px-9 py-3.5 text-lg font-bold text-paper transition-colors hover:bg-espresso-deep"
            >
              افحص أرضك الآن
            </a>
            <a
              href="#pipeline"
              className="text-lg text-olive underline decoration-2 underline-offset-8 transition-colors hover:text-espresso"
            >
              كيف تعمل؟
            </a>
          </div>
        </div>

        <div className="flex justify-center md:justify-start">
          <DesertScene />
        </div>
      </div>
      <WavePattern className="h-14 md:h-24" />
    </section>
  );
}
