import { LandingWorkbenchPreview } from "./LandingWorkbenchPreview";

export function LandingProductMockup() {
  return (
    <section className="overflow-hidden bg-[#0e0e0e] px-[40px] py-[48px]">
      <div className="mx-auto max-w-[1440px]">
        <div className="perspective-mockup terminal-border overflow-hidden rounded-xl bg-[#050505] shadow-2xl">
          <LandingWorkbenchPreview />
        </div>
      </div>
    </section>
  );
}
