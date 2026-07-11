/**
 * تسمية بخط إشارة زيتوني — نمط سلايد المواصفات في العرض:
 * خط رفيع يصل الشرح بالعنصر المشروح، مع نقطة صغيرة عند الطرف.
 */
export default function LeaderLabel({
  title,
  desc,
  align = "start",
}: {
  title: string;
  desc: string;
  align?: "start" | "end";
}) {
  return (
    <div
      className={`flex flex-col gap-1 ${align === "end" ? "items-end text-left" : "items-start text-right"}`}
    >
      <div className={`flex items-center gap-2 ${align === "end" ? "flex-row-reverse" : ""}`}>
        <span className="block h-2 w-2 rounded-full bg-olive" aria-hidden />
        <span className="block h-px w-10 bg-olive" aria-hidden />
        <h4 className="display text-base font-bold text-espresso">{title}</h4>
      </div>
      <p className="max-w-56 text-sm leading-relaxed text-ink-soft">{desc}</p>
    </div>
  );
}
