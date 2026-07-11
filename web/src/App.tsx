import Nav from "./components/Nav";
import Footer from "./components/Footer";
import Hero from "./sections/Hero";
import Problem from "./sections/Problem";
import Solution from "./sections/Solution";
import Pipeline from "./sections/Pipeline";
import Demo from "./sections/Demo";
import SeedBullet3D from "./sections/SeedBullet3D";
import Science from "./sections/Science";
import Specs from "./sections/Specs";
import Pricing from "./sections/Pricing";
import Competitors from "./sections/Competitors";
import Team from "./sections/Team";

export default function App() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <Problem />
        <Solution />
        <Pipeline />
        <Demo />
        <SeedBullet3D />
        <Science />
        <Specs />
        <Pricing />
        <Competitors />
        <Team />
      </main>
      <Footer />
    </>
  );
}
