import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

export default {
	darkMode: ["class"],
	content: ["./index.html", "./src/**/*.{ts,tsx}"],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: "2rem",
			screens: {
				"2xl": "1400px",
			},
		},
		extend: {
			colors: {
				bg: {
					base: "var(--bg-base)",
					soft: "var(--bg-soft)",
					paper: "var(--bg-paper)",
					elevated: "var(--bg-elevated)",
				},
				text: {
					primary: "var(--text-primary)",
					secondary: "var(--text-secondary)",
					muted: "var(--text-muted)",
				},
				brand: {
					DEFAULT: "var(--brand-default)",
					accent: "var(--accent-cyan)",
					100: "var(--brand-100)",
					200: "var(--brand-200)",
					400: "var(--brand-400)",
					500: "var(--brand-500)",
					600: "var(--brand-600)",
					700: "var(--brand-700)",
				},
				accent: {
					DEFAULT: "hsl(var(--accent))",
					foreground: "hsl(var(--accent-foreground))",
					cyan: "var(--accent-cyan)",
					green: "var(--accent-green)",
					yellow: "var(--accent-yellow)",
					red: "var(--accent-red)",
					purple: "var(--accent-purple)",
				},
				stroke: {
					subtle: "var(--stroke-subtle)",
					strong: "var(--stroke-strong)",
				},
				border: "hsl(var(--border))",
				input: "hsl(var(--input))",
				ring: "hsl(var(--ring))",
				background: "hsl(var(--background))",
				foreground: "hsl(var(--foreground))",
				primary: {
					DEFAULT: "hsl(var(--primary))",
					foreground: "hsl(var(--primary-foreground))",
				},
				secondary: {
					DEFAULT: "hsl(var(--secondary))",
					foreground: "hsl(var(--secondary-foreground))",
				},
				destructive: {
					DEFAULT: "hsl(var(--destructive))",
					foreground: "hsl(var(--destructive-foreground))",
				},
				muted: {
					DEFAULT: "hsl(var(--muted))",
					foreground: "hsl(var(--muted-foreground))",
				},
				popover: {
					DEFAULT: "hsl(var(--popover))",
					foreground: "hsl(var(--popover-foreground))",
				},
				card: {
					DEFAULT: "hsl(var(--card))",
					foreground: "hsl(var(--card-foreground))",
				},
				sidebar: {
					DEFAULT: "hsl(var(--sidebar-background))",
					foreground: "hsl(var(--sidebar-foreground))",
					primary: "hsl(var(--sidebar-primary))",
					"primary-foreground": "hsl(var(--sidebar-primary-foreground))",
					accent: "hsl(var(--sidebar-accent))",
					"accent-foreground": "hsl(var(--sidebar-accent-foreground))",
					border: "hsl(var(--sidebar-border))",
					ring: "hsl(var(--sidebar-ring))",
				},
			},
			borderRadius: {
				sm: "var(--radius-sm)",
				md: "var(--radius-md)",
				lg: "var(--radius-lg)",
				xl: "var(--radius-xl)",
				"2xl": "var(--radius-2xl)",
				pill: "9999px",
			},
			boxShadow: {
				card: "var(--shadow-card)",
				cardHover: "var(--shadow-card-hover)",
				soft: "var(--shadow-soft)",
				hard: "var(--shadow-hard)",
			},
			fontFamily: {
				sans: ["Inter", "system-ui", "sans-serif"],
				display: ["Inter", "system-ui", "sans-serif"],
				mono: ["JetBrains Mono", "ui-monospace", "monospace"],
			},
			spacing: {
				gutter: "var(--space-gutter)",
				"stack-sm": "var(--space-stack-sm)",
				"stack-md": "var(--space-stack-md)",
				"stack-lg": "var(--space-stack-lg)",
			},
			maxWidth: {
				workspace: "var(--layout-max)",
			},
			transitionDuration: {
				fast: "var(--motion-fast)",
				base: "var(--motion-base)",
				slow: "var(--motion-slow)",
			},
			keyframes: {
				"accordion-down": {
					from: { height: "0" },
					to: { height: "var(--radix-accordion-content-height)" },
				},
				"accordion-up": {
					from: { height: "var(--radix-accordion-content-height)" },
					to: { height: "0" },
				},
				"pulse-signal": {
					"0%, 100%": { opacity: "1" },
					"50%": { opacity: "0.4" },
				},
			},
			animation: {
				"accordion-down": "accordion-down 0.2s ease-out",
				"accordion-up": "accordion-up 0.2s ease-out",
				"pulse-signal": "pulse-signal 2s ease-in-out infinite",
			},
		},
	},
	plugins: [tailwindcssAnimate],
} satisfies Config;
