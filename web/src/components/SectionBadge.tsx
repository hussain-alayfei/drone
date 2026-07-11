/**
 * بادج العنوان الكبسولي — موروث من العرض التقديمي: كبسولة إسبريسو بنص أبيض،
 * استدارة كاملة من جهة وأخف من الجهة الأخرى، بمحاذاة يمين القسم (RTL).
 */
export default function SectionBadge({ children }: { children: string }) {
  return (
    <div className="mb-10 flex justify-start">
      <h2
        className="display rounded-r-[6px] rounded-l-full bg-espresso px-10 py-3 text-xl font-bold text-paper md:text-2xl"
      >
        {children}
      </h2>
    </div>
  );
}
