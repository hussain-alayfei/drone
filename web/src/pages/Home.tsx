/**
 * الصفحة التعريفية — الفكرة نفسها: المشكلة، الحل، طريقة العمل، الرصاصة،
 * المواصفات، الباقات. التجربة الحية والموديل انتقلا إلى /demo.
 */
import Hero from "../sections/Hero";
import Problem from "../sections/Problem";
import Solution from "../sections/Solution";
import Pipeline from "../sections/Pipeline";
import SeedBullet3D from "../sections/SeedBullet3D";
import Specs from "../sections/Specs";
import Pricing from "../sections/Pricing";
import DemoCta from "../sections/DemoCta";

export default function Home() {
  return (
    <>
      <Hero />
      <Problem />
      <Solution />
      <Pipeline />
      <DemoCta />
      <SeedBullet3D />
      <Specs />
      <Pricing />
    </>
  );
}
