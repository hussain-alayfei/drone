import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * التنقّل بين المسارات يبقي موضع السكرول كما هو افتراضياً — نعيده للأعلى
 * عند تغيّر المسار، لكن لا نلمسه عند الانتقال لمرساة (#demo مثلاً).
 */
export default function ScrollToTop() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) return;
    window.scrollTo(0, 0);
  }, [pathname, hash]);

  return null;
}
