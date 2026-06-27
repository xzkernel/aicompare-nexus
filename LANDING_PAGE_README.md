# ModelWise Landing Page

A clean, modern landing page built with React, TypeScript, and Tailwind CSS, featuring a TestSprite.com-inspired design.

## 🎨 Design System

### Colors
- **Brand**: `#0f172a` (slate-900)
- **Accent**: `#4f46e5` (indigo-600)
- **Grays**: Slate color palette for text and backgrounds

### Typography
- **H1**: `text-6xl md:text-7xl` (Hero headlines)
- **H2**: `text-4xl` (Section headers)
- **Body**: `text-base md:text-lg` (Regular text)

### Spacing & Layout
- **Section padding**: `py-20 md:py-32` (64-80px)
- **Container max-width**: `max-w-6xl`
- **Horizontal padding**: `px-6`
- **Card shadows**: Custom `shadow-card` and `shadow-cardHover`

### Border Radius
- **Cards**: `rounded-2xl` (1.25rem)
- **Buttons**: `rounded-2xl`
- **Small elements**: `rounded-xl` (1rem)

## 🧩 Components

### Core Components
- **`LandingHeader`**: Sticky navigation with logo, nav links, and CTAs
- **`Hero`**: Main headline, value proposition, CTAs, and product mock
- **`SocialProof`**: Company logos and customer testimonials
- **`Features`**: Three feature cards with icons and descriptions
- **`HowItWorks`**: 4-step timeline (horizontal on desktop, vertical on mobile)
- **`Integrations`**: Grid of integration logos with hover effects
- **`PricingTeaser`**: Free tier highlight with CTA
- **`FAQ`**: Accordion-style frequently asked questions

### Component Features
- **Responsive design**: Mobile-first approach with breakpoint-specific layouts
- **Hover effects**: Subtle shadows, transforms, and color transitions
- **Animations**: Staggered fade-in animations with CSS keyframes
- **Accessibility**: Proper ARIA attributes, keyboard navigation support

## 🚀 Getting Started

### Routes
- **`/`**: Landing page (new)
- **`/app`**: Main application (existing)

### Development
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## 🎯 Key Features

### Design Principles
- **Spacious layout**: Generous whitespace and breathing room
- **Large typography**: Readable, impactful text hierarchy
- **Soft shadows**: Subtle depth without overwhelming
- **Rounded corners**: Modern, friendly aesthetic
- **Minimal color palette**: Brand + grays for clean look

### Animation Strategy
- **Subtle reveals**: 150-250ms fade-in animations
- **Staggered timing**: Sequential element animations
- **Hover interactions**: Smooth transitions on interactive elements
- **Performance**: CSS-only animations for smooth 60fps

### Content Guidelines
- **Headings**: ≤ 7 words for clarity
- **Blurbs**: ≤ 18 words for readability
- **CTAs**: Clear, action-oriented language
- **Value props**: Concise, benefit-focused messaging

## 🔧 Customization

### Tailwind Config
The design system is built on custom Tailwind tokens:
- `brand` colors for primary and accent
- `shadow-card` and `shadow-cardHover` for consistent shadows
- `rounded-2xl` for large border radius

### Component Props
Most components accept standard props for customization:
- Icons via Lucide React
- Text content via props
- Styling via className overrides

## 📱 Responsive Behavior

### Breakpoints
- **Mobile**: Single column layouts, stacked elements
- **Tablet**: Two-column grids where appropriate
- **Desktop**: Full multi-column layouts with horizontal timelines

### Mobile Optimizations
- Touch-friendly button sizes
- Readable text at all screen sizes
- Optimized spacing for small screens

## 🎨 Animation Classes

### Available Animations
- `animate-in fade-in`: Fade in from transparent
- `duration-1000`: 1-second animation duration
- `delay-200`, `delay-400`, `delay-600`: Staggered timing

### Usage Example
```tsx
<div className="animate-in fade-in duration-1000 delay-200">
  Content with delayed fade-in animation
</div>
```

## 🔗 Navigation

The landing page includes smooth scrolling navigation:
- Features section
- How it works timeline
- Integrations showcase
- Pricing information
- FAQ section

All navigation links use anchor links with smooth scrolling behavior.

## 📄 File Structure

```
src/
├── components/
│   ├── LandingHeader.tsx      # Navigation header
│   ├── Hero.tsx              # Main hero section
│   ├── SocialProof.tsx       # Social proof section
│   ├── Features.tsx          # Features grid
│   ├── FeatureCard.tsx       # Individual feature card
│   ├── HowItWorks.tsx        # Timeline section
│   ├── Integrations.tsx      # Integrations grid
│   ├── PricingTeaser.tsx     # Pricing section
│   └── FAQ.tsx               # FAQ accordion
├── pages/
│   ├── Landing.tsx           # Landing page component
│   └── Index.tsx             # Main app (existing)
└── App.tsx                   # Updated routing
```

## 🚀 Deployment

The landing page is ready for production deployment:
- Optimized for performance
- SEO-friendly structure
- Accessible design
- Mobile-responsive layout

Build and deploy using your preferred hosting platform.
