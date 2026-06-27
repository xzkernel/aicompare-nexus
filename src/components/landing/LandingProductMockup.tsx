import { LandingWorkbenchPreview } from "./LandingWorkbenchPreview";

/**
 * Stitch: py-stack-lg (48px), px-margin-safe (40px), bg-surface-container-lowest (#0e0e0e).
 * Preview wrapper: perspective-mockup, bg-[#050505], terminal-border, rounded-xl, shadow-2xl.
 * No metadata strips. No section-glow overlay.
 */
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
