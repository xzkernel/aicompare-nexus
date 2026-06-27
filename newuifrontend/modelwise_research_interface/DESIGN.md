---
name: ModelWise Frontier
colors:
  surface: '#121414'
  surface-dim: '#131313'
  surface-bright: '#3a3939'
  surface-container-lowest: '#0e0e0e'
  surface-container-low: '#1c1b1b'
  surface-container: '#1e2020'
  surface-container-high: '#2a2a2a'
  surface-container-highest: '#353534'
  on-surface: '#e5e2e1'
  on-surface-variant: '#c4c7c8'
  inverse-surface: '#e5e2e1'
  inverse-on-surface: '#313030'
  outline: '#8e9192'
  outline-variant: '#444748'
  surface-tint: '#c6c6c7'
  primary: '#ffffff'
  on-primary: '#2f3131'
  primary-container: '#e2e2e2'
  on-primary-container: '#636565'
  inverse-primary: '#5d5f5f'
  secondary: '#4ad8f0'
  on-secondary: '#00363e'
  secondary-container: '#00b6ce'
  on-secondary-container: '#00424c'
  tertiary: '#ffffff'
  on-tertiary: '#313030'
  tertiary-container: '#e5e2e1'
  on-tertiary-container: '#656463'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#e2e2e2'
  primary-fixed-dim: '#c6c6c7'
  on-primary-fixed: '#1a1c1c'
  on-primary-fixed-variant: '#454747'
  secondary-fixed: '#a2eeff'
  secondary-fixed-dim: '#4ad8f0'
  on-secondary-fixed: '#001f25'
  on-secondary-fixed-variant: '#004e5a'
  tertiary-fixed: '#e5e2e1'
  tertiary-fixed-dim: '#c8c6c5'
  on-tertiary-fixed: '#1c1b1b'
  on-tertiary-fixed-variant: '#474746'
  background: '#131313'
  on-background: '#e5e2e1'
  surface-variant: '#353534'
  syntax-keyword: '#5de6ff'
  syntax-const: '#ffffff'
  syntax-string: '#e5e2e1'
  syntax-comment: '#444748'
  premium-border: rgba(255, 255, 255, 0.06)
  premium-border-high: rgba(255, 255, 255, 0.12)
typography:
  display-hero:
    fontFamily: Instrument Serif
    fontSize: 180px
    fontWeight: '400'
    lineHeight: '0.85'
    letterSpacing: -0.04em
  display-hero-mobile:
    fontFamily: Instrument Serif
    fontSize: 13vw
    fontWeight: '400'
    lineHeight: '0.85'
  headline-section:
    fontFamily: Instrument Serif
    fontSize: 72px
    fontWeight: '400'
    lineHeight: '1.1'
  body-lg:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '300'
    lineHeight: '1.6'
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
  label-mono-allcaps:
    fontFamily: Geist Mono
    fontSize: 10px
    fontWeight: '500'
    letterSpacing: 0.3em
  label-mono-standard:
    fontFamily: Geist Mono
    fontSize: 12px
    fontWeight: '400'
    lineHeight: '1'
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  container-max: 1440px
  gutter: 24px
  margin-safe: 40px
  stack-sm: 8px
  stack-md: 16px
  stack-lg: 48px
  unit: 4px
---

## Brand & Style

ModelWise Frontier is a high-performance design system tailored for elite developer tools and AI orchestration platforms. The brand personality is **Technical, Sovereign, and Hyper-Efficient**, evoking a sense of "under-the-hood" power and architectural stability.

The visual style is a sophisticated blend of **Brutalism and Glassmorphism**, characterized by:
- **Terminal Aesthetics:** Monospaced data overlays and "live-stream" code simulations.
- **Atmospheric Depth:** The use of "glow" gradients and grain overlays to prevent a flat digital feel, creating a sense of infinite digital space.
- **Precision Engineering:** Sharp structural lines contrasted with perfectly circular "pill" elements for interaction points.
- **Deterministic Motion:** High-speed, linear animations that mimic data transmission and pulse signals.

## Colors

The palette is rooted in an **absolute dark foundation** (#080808), utilizing high-contrast accents to guide the eye through complex data hierarchies.

- **Primary White (#FFFFFF):** Reserved for essential content and high-priority headlines. It represents the "final output" or the truth.
- **Electric Cyan (#5DE6FF):** The "Intelligence" color. Used for active states, live compute signals, and technical keywords. It should feel like it's glowing against the dark background.
- **Muted Grays and Silvers:** Used for secondary metadata and syntax strings to prevent visual fatigue during long sessions.
- **Atmospheric Overlays:** Subtle radial gradients (0.015% - 0.03% opacity) are used to create "hero glows" and "section glows" that break up the solid black background.

## Typography

The typography system relies on a high-contrast pairing of **Editorial Elegance** and **Technical Utility**.

1.  **Display Typography:** Uses *Instrument Serif* (often italicized). This adds a "premium" layer to the brand, making it feel more like a research institution than a basic utility.
2.  **Technical Labels:** Uses *Geist Mono*. All metadata, status indicators, and system IDs must use monospaced fonts to reinforce the developer-centric nature of the product.
3.  **Interface Text:** Uses *Inter* for body copy and general interface elements to ensure maximum legibility at small sizes.

**Scale & Rhythm:** Use aggressive scale differences. Headlines should be massive and condensed, while metadata labels should be tiny, tracked out (letter-spacing), and capitalized.

## Layout & Spacing

The layout philosophy follows a **Fixed Container Grid** with **Fluid Hero Scaling**.

- **Structure:** Content is housed within a 1440px max-width container. 
- **The "Perspective" Layout:** Complex interface mockups should use a subtle CSS perspective (e.g., `rotateX(10deg)`) to create depth without traditional shadows.
- **Rhythm:** A 4px baseline grid governs all spacing.
- **Responsive Behavior:** 
    - **Desktop:** Multi-column layouts with significant horizontal "off-setting" (e.g., paragraphs indented by 40% to create asymmetrical interest).
    - **Mobile:** Single column stacking with margins reduced to 20px. Display font sizes transition from px to `vw` units to maintain the "massive" headline effect on small screens.

## Elevation & Depth

ModelWise rejects traditional shadows in favor of **Atmospheric Layering** and **Luminous Borders**.

1.  **Glassmorphism:** Navigation and toolbars use high-intensity backdrop blurs (2xl) with low-opacity backgrounds (`bg-white/5` or `bg-background/60`).
2.  **Premium Borders:** Depth is defined by 1px solid borders using white at 6% or 12% opacity. This creates a "blueprint" feel.
3.  **Glows vs. Shadows:** Instead of drop shadows, use `box-shadow: 0 0 20px rgba(255,255,255,0.1)` for active elements or cyan outer glows for status signals.
4.  **Grain:** A fixed 3% opacity grain overlay sits above the entire UI, providing a tactile, "analog" texture to the digital surfaces.

## Shapes

The shape system is built on **Contrast of Extremes**:

- **Containers & Panels:** Use a "Soft" radius (0.75rem or 12px) to feel modern and structural.
- **Interactive Elements:** Buttons and pill-badges use a "Full" (pill-shaped) radius.
- **Technical Elements:** Code blocks, syntax highlights, and internal table cells use sharp or "Micro" (4px) corners to maintain a technical edge.

## Components

### Buttons
- **Primary:** Solid white, sharp or pill-shaped, black text. High-contrast, no border. On hover, transition to the Secondary color (#5DE6FF).
- **Ghost/Technical:** Monospaced font, no background, 1px border at 6% opacity.

### Badges & Chips
- **Status Pills:** Small, uppercase monospaced text. Always accompanied by a "Pulse Signal" (a 4px dot with a glow animation).
- **Tech Tags:** Small rectangular boxes with dashed borders for terminal-style diffs or metadata.

### Panels (The "Workbench")
- Panels should feature a "Toolbar" header with window controls (three muted dots) and a "Status Bar" footer. 
- Use a `divide-x` strategy for multi-panel views rather than separate cards to emphasize the "integrated" nature of the workbench.

### Inputs & Tables
- **Tables:** No outer borders, only horizontal dividers at 5% opacity. Headers must be all-caps, monospaced, and tracked-out.
- **Lists:** Use monospaced "Step" indicators (01, 02) inside small circular borders for sequential workflows.