import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";
import Nav from "./components/Nav";
import Footer from "./components/Footer";
import ScrollToTop from "./components/ScrollToTop";
import Home from "./pages/Home";

// صفحة الديمو تسحب three وشبكة بيانات USGS — تُحمَّل عند دخولها فقط
// كي تبقى الصفحة التعريفية خفيفة.
const Demo = lazy(() => import("./pages/Demo"));

function DemoFallback() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <p className="text-ink-soft">…جارٍ تحميل التجربة الحية</p>
    </div>
  );
}

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Nav />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route
            path="/demo"
            element={
              <Suspense fallback={<DemoFallback />}>
                <Demo />
              </Suspense>
            }
          />
          <Route path="*" element={<Home />} />
        </Routes>
      </main>
      <Footer />
    </>
  );
}
