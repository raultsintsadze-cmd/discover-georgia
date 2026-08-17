import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

// Maps the CSS-variable tokens defined in src/app/globals.css into Tailwind
// utility classes, so token changes only ever happen in one file.
const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        surface: {
          0: "hsl(var(--surface-0))",
          1: "hsl(var(--surface-1))",
          2: "hsl(var(--surface-2))",
        },
        border: "hsl(var(--border))",
        ink: {
          900: "hsl(var(--ink-900))",
          700: "hsl(var(--ink-700))",
          500: "hsl(var(--ink-500))",
          onaccent: "hsl(var(--ink-on-accent))",
        },
        accent: {
          500: "hsl(var(--accent-500))",
          600: "hsl(var(--accent-600))",
          tint: "hsl(var(--accent-tint))",
        },
        wine: {
          500: "hsl(var(--wine-500))",
          tint: "hsl(var(--wine-tint))",
        },
        success: {
          500: "hsl(var(--success-500))",
          tint: "hsl(var(--success-tint))",
        },
        warning: {
          500: "hsl(var(--warning-500))",
          tint: "hsl(var(--warning-tint))",
        },
        danger: {
          500: "hsl(var(--danger-500))",
          tint: "hsl(var(--danger-tint))",
        },
        chrome: {
          bg: "hsl(var(--chrome-bg))",
          ink: "hsl(var(--chrome-ink))",
          "ink-muted": "hsl(var(--chrome-ink-muted))",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)"],
        display: ["var(--font-display)"],
      },
      fontSize: {
        display: ["2.25rem", { lineHeight: "1.1", letterSpacing: "-0.02em", fontWeight: "600" }],
        h1: ["1.75rem", { lineHeight: "1.2", letterSpacing: "-0.01em", fontWeight: "600" }],
        h2: ["1.375rem", { lineHeight: "1.3", fontWeight: "600" }],
        h3: ["1.125rem", { lineHeight: "1.4", fontWeight: "600" }],
        body: ["1rem", { lineHeight: "1.5" }],
        "body-sm": ["0.875rem", { lineHeight: "1.5" }],
        caption: ["0.75rem", { lineHeight: "1.4" }],
      },
      borderRadius: {
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        full: "var(--radius-full)",
      },
      boxShadow: {
        sm: "0 1px 2px 0 hsl(27 15% 9% / 0.06)",
        md: "0 4px 16px -4px hsl(27 15% 9% / 0.12)",
        lg: "0 16px 40px -12px hsl(27 15% 9% / 0.22)",
      },
      spacing: {
        touch: "var(--touch-target)",
      },
      transitionTimingFunction: {
        out: "var(--ease-out)",
      },
      transitionDuration: {
        fast: "150ms",
        base: "250ms",
        slow: "400ms",
      },
      keyframes: {
        "sheet-in": { from: { transform: "translateY(100%)" }, to: { transform: "translateY(0)" } },
        "sheet-out": { from: { transform: "translateY(0)" }, to: { transform: "translateY(100%)" } },
        "fade-in": { from: { opacity: "0" }, to: { opacity: "1" } },
        "fade-out": { from: { opacity: "1" }, to: { opacity: "0" } },
        "toast-in": { from: { transform: "translateY(-100%)", opacity: "0" }, to: { transform: "translateY(0)", opacity: "1" } },
      },
      animation: {
        "sheet-in": "sheet-in var(--duration-base) var(--ease-out)",
        "sheet-out": "sheet-out var(--duration-base) var(--ease-out)",
        "fade-in": "fade-in var(--duration-fast) var(--ease-out)",
        "fade-out": "fade-out var(--duration-fast) var(--ease-out)",
        "toast-in": "toast-in var(--duration-base) var(--ease-out)",
      },
    },
  },
  plugins: [tailwindcssAnimate],
};

export default config;
