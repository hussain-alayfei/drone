/**
 * الخط المموّج — عنصر التوقيع الأقوى في هوية «عين» (يظهر أسفل أغلب سلايدات
 * العرض). مرسوم يدوياً كمنحنيات متدرجة الشفافية، وليس pattern مولّد.
 */
export default function WavePattern({
  tone = "light",
  className = "",
}: {
  tone?: "light" | "dark";
  className?: string;
}) {
  const stroke = tone === "light" ? "#DFF0E2" : "#4A3B32";
  return (
    <svg
      viewBox="0 0 1440 150"
      preserveAspectRatio="none"
      aria-hidden="true"
      className={`pointer-events-none w-full ${className}`}
    >
      {[0, 1, 2, 3].map((i) => (
        <path
          key={i}
          d={`M-20 ${34 + i * 30}
             C 120 ${10 + i * 30}, 260 ${58 + i * 30}, 420 ${36 + i * 30}
             S 700 ${8 + i * 30}, 880 ${40 + i * 30}
             S 1180 ${64 + i * 30}, 1460 ${28 + i * 30}`}
          fill="none"
          stroke={stroke}
          strokeWidth={i === 1 ? 5 : 3}
          strokeLinecap="round"
          opacity={0.9 - i * 0.18}
        />
      ))}
    </svg>
  );
}
