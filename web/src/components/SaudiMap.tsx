import { MAP_H, MAP_W, regionShapes } from "../data/saudi-map";

/**
 * خريطة مناطق السعودية — SVG مولّد من بيانات حدود حقيقية (geoBoundaries)،
 * كل منطقة زر قابل للتركيز بالكيبورد. نبض الفحص عند مركز المنطقة المختارة.
 */
export default function SaudiMap({
  selected,
  scanning,
  onSelect,
}: {
  selected: string | null;
  scanning: boolean;
  onSelect: (id: string) => void;
}) {
  const sel = regionShapes.find((r) => r.id === selected);

  return (
    <svg
      viewBox={`0 0 ${MAP_W} ${MAP_H}`}
      role="group"
      aria-label="خريطة مناطق المملكة — اختر منطقة لفحص تربتها"
      className="w-full"
    >
      {regionShapes.map((r) => {
        const isSel = r.id === selected;
        return (
          <path
            key={r.id}
            d={r.d}
            role="button"
            tabIndex={0}
            aria-label={`فحص تربة منطقة ${r.ar}`}
            aria-pressed={isSel}
            onClick={() => onSelect(r.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect(r.id);
              }
            }}
            className={`cursor-pointer stroke-espresso/50 outline-none transition-colors duration-150 focus-visible:stroke-wine focus-visible:stroke-2 ${
              isSel ? "fill-gold" : "fill-cream hover:fill-beige-card"
            }`}
            strokeWidth="1.2"
            strokeLinejoin="round"
          >
            <title>{r.ar}</title>
          </path>
        );
      })}

      {/* نبض الفحص */}
      {sel && scanning && (
        <g className="pointer-events-none motion-reduce:hidden">
          {[0, 1].map((i) => (
            <circle
              key={i}
              cx={sel.cx}
              cy={sel.cy}
              r="14"
              fill="none"
              stroke="#4A2E35"
              strokeWidth="3"
              opacity="0"
              style={{
                animation: `ain-pulse 1.1s ease-out ${i * 0.55}s infinite`,
                transformOrigin: `${sel.cx}px ${sel.cy}px`,
              }}
            />
          ))}
          <circle cx={sel.cx} cy={sel.cy} r="5" fill="#4A2E35" />
        </g>
      )}
      {sel && !scanning && (
        <circle
          cx={sel.cx}
          cy={sel.cy}
          r="6"
          fill="#4A2E35"
          className="pointer-events-none"
        />
      )}
    </svg>
  );
}
