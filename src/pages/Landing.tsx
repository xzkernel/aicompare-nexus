import { LandingHeader } from "../components/LandingHeader";
import { Hero } from "../components/Hero";
import { LandingProductMockup } from "../components/landing/LandingProductMockup";
import { Features } from "../components/Features";
import { HowItWorks } from "../components/HowItWorks";
import { Integrations } from "../components/Integrations";
import { FAQ } from "../components/FAQ";
import { Footer } from "../components/Footer";

export function Landing() {
  return (
    <div className="landing-page">
      <div className="landing-grain" aria-hidden />
      <LandingHeader />
      <main>
        <Hero />
        <LandingProductMockup />
        <Features />
        <HowItWorks />
        <Integrations />
        <FAQ />
        <Footer />
      </main>
    </div>
  );
}
