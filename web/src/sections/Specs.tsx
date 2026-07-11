import SectionBadge from "../components/SectionBadge";
import LeaderLabel from "../components/LeaderLabel";
import { specs } from "../data/content";

/** رسم الدرون مع الكاشف ووحدة الكبسولات — بألوان الهوية، مرسوم يدوياً */
function DroneDiagram() {
  return (
    <svg
      viewBox="0 0 360 300"
      role="img"
      aria-label="مخطط الدرون: الهيكل، الكاشف الإشعاعي، ووحدة الكبسولات"
      className="mx-auto w-full max-w-sm"
    >
      {/* أذرع ومراوح */}
      <g stroke="#3E2F26" strokeWidth="7" strokeLinecap="round">
        <path d="M140 120 L70 78 M220 120 L290 78" />
      </g>
      <g stroke="#3E2F26" strokeWidth="4" strokeLinecap="round">
        <path d="M34 74 H106 M254 74 H326" />
      </g>
      <circle cx="70" cy="74" r="6" fill="#3E2F26" />
      <circle cx="290" cy="74" r="6" fill="#3E2F26" />

      {/* الجسم */}
      <rect x="128" y="108" width="104" height="40" rx="12" fill="#3E2F26" />
      <rect x="150" y="148" width="60" height="16" rx="6" fill="#2A211B" />
      {/* الكاميرا */}
      <circle cx="180" cy="172" r="10" fill="#2A211B" />
      <circle cx="180" cy="172" r="4" fill="#BFA06E" />

      {/* أرجل الهبوط */}
      <g stroke="#3E2F26" strokeWidth="5" strokeLinecap="round" fill="none">
        <path d="M140 148 L118 210 M220 148 L242 210" />
        <path d="M104 212 H136 M224 212 H256" />
      </g>

      {/* الكاشف الإشعاعي (أسطوانة Medusa) */}
      <g>
        <rect x="120" y="222" width="70" height="30" rx="15" fill="#DCC9A3" stroke="#3E2F26" strokeWidth="2" />
        <path d="M132 222 v-8 M178 222 v-8" stroke="#3E2F26" strokeWidth="2" />
        <circle cx="155" cy="237" r="5" fill="#4A2E35" />
      </g>

      {/* مخزن الرصاص الزراعي */}
      <g>
        <rect x="200" y="220" width="52" height="34" rx="6" fill="#4A2E35" />
        {[212, 226, 240].map((x) => (
          <path
            key={x}
            d={`M${x} 226 c 3 4 4 7 4 10 a 4 4 0 0 1 -8 0 c 0 -3 1 -6 4 -10 Z`}
            fill="#C8A97E"
          />
        ))}
      </g>

      {/* موجات القياس */}
      <g stroke="#A98D5F" strokeWidth="2" strokeDasharray="2 6" strokeLinecap="round" fill="none">
        <path d="M150 262 q 5 8 0 16 M160 262 q 5 8 0 16 M170 262 q 5 8 0 16" />
      </g>
    </svg>
  );
}

export default function Specs() {
  const [a, b, c, d, e] = specs.items;
  return (
    <section id="specs" className="bg-cream py-16 md:py-24">
      <div className="mx-auto max-w-6xl px-5 md:px-8">
        <SectionBadge>{specs.title}</SectionBadge>

        <div className="grid items-center gap-10 lg:grid-cols-[1fr_auto_1fr]">
          <div className="order-2 flex flex-col gap-10 lg:order-1">
            <LeaderLabel title={a.name} desc={a.desc} />
            <LeaderLabel title={b.name} desc={b.desc} />
            <LeaderLabel title={c.name} desc={c.desc} />
          </div>

          <div className="order-1 lg:order-2">
            <DroneDiagram />
          </div>

          <div className="order-3 flex flex-col gap-10 lg:items-end">
            <LeaderLabel title={d.name} desc={d.desc} align="end" />
            <LeaderLabel title={e.name} desc={e.desc} align="end" />
          </div>
        </div>
      </div>
    </section>
  );
}
