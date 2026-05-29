// Design system reference: docs/DESIGN-FIGMA.md
// Figma marketing design language — monochrome core + pastel color blocks + pill buttons

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // ── shadcn CSS-variable colors ──────────────────────────────────────
      colors: {
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
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },

        // ── Figma surface tokens ─────────────────────────────────────────
        // docs/DESIGN-FIGMA.md > Colors > Surface
        "surface-soft": "#f5f5f5",   // {colors.surface-soft} icon buttons, template tiles
        hairline:       "#d0d0d0",   // {colors.hairline}      1px form/card borders
        "hairline-soft":"#e8e8e8",   // {colors.hairline-soft} subtle dividers

        // ── Figma block colors (signature pastel palette) ────────────────
        // docs/DESIGN-FIGMA.md > Colors > Surface
        "block-lime":  "#c5e530",    // {colors.block-lime}  systems / FAQ / contact
        "block-lilac": "#c4b4e4",    // {colors.block-lilac} design hero, promo banner
        "block-cream": "#f0e6d3",    // {colors.block-cream} warm background sections
        "block-mint":  "#b4e4d4",    // {colors.block-mint}  pastel section
        "block-pink":  "#f4b4c4",    // {colors.block-pink}  pastel section
        "block-coral": "#f48464",    // {colors.block-coral} story block
        "block-navy":  "#2a2a5a",    // {colors.block-navy}  deep indigo (only dark section above footer)

        // ── Figma accent ─────────────────────────────────────────────────
        "accent-magenta": "#e91e63", // {colors.accent-magenta} — use scarcely (1 promo CTA per page)
      },

      // ── shadcn radius tokens (CSS-variable based) ────────────────────
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",

        // ── Figma shape tokens ─────────────────────────────────────────
        // docs/DESIGN-FIGMA.md > Shapes > Border Radius Scale
        pill:  "50px",   // {rounded.pill}  ALL text CTAs — primary and secondary buttons
        block: "24px",   // {rounded.lg}    color-block sections, pricing cards
        hero:  "32px",   // {rounded.xl}    hero feature panels, oversized callouts
        chip:  "6px",    // {rounded.sm}    small chips, sub-nav tabs
        link:  "2px",    // {rounded.xs}    anchor / link decoration corners
      },

      // ── Figma font families ──────────────────────────────────────────
      // docs/DESIGN-FIGMA.md > Typography > Font Family
      // Inter = figmaSans substitute (variable weight 100-900)
      // JetBrains Mono = figmaMono substitute (eyebrow/caption only)
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
        mono: ["JetBrains Mono", "SF Mono", "Menlo", "monospace"],
      },

      // ── Keyframes for shadcn animations ─────────────────────────────
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
