import { defineConfig } from "@pandacss/dev";

// biome-ignore lint/style/noDefaultExport: Required by Panda
export default defineConfig({
  // We use the deliberately minimal reset in globalCss (below) rather than Panda's preflight: preflight
  // is a heavier normalize that strips list markers and link underlines, which the raw markdown content
  // (notes, what's-new) relies on.
  preflight: false,

  include: ["./src/**/*.{ts,tsx}"],
  dependencies: ["./src/**/*.{ts,tsx}"],
  exclude: [],

  jsxFramework: "react",

  outdir: "styled-system",

  conditions: {
    extend: {
      compact: ".compact-mode-active &",
    },
  },

  theme: {
    extend: {
      keyframes: {
        spin: { to: { transform: "rotate(360deg)" } },
      },

      tokens: {
        radii: {
          xs: { value: "4px" },
          sm: { value: "6px" },
          md: { value: "8px" },
          lg: { value: "12px" },
          xl: { value: "24px" },
          "2xl": { value: "36px" },
          full: { value: "9999px" },
        },
        fontSizes: {
          "2xs": { value: "0.65rem" },
          xs: { value: "0.75rem" },
          sm: { value: "0.875rem" },
          base: { value: "1rem" },
          lg: { value: "1.25rem" },
          xl: { value: "1.5rem" },
          "2xl": { value: "2rem" },
          "3xl": { value: "3rem" },
          display: { value: "3.75rem" },
        },
        fontWeights: {
          light: { value: 300 },
          regular: { value: 400 },
          medium: { value: 500 },
          semibold: { value: 600 },
        },
        lineHeights: {
          none: { value: 1 },
          tight: { value: 1.2 },
          normal: { value: 1.5 },
          relaxed: { value: 1.65 },
        },
        zIndex: {
          base: { value: 0 },
          docked: { value: 100 },
          dropdown: { value: 1000 },
          modal: { value: 2000 },
          toast: { value: 3000 },
          tooltip: { value: 4000 },
          "app-cover": { value: 9000 },
        },
        shadows: {
          raised: { value: "rgba(0, 0, 0, 0.25) 0px 4px 6px 4px" },
          overlay: { value: "0px 4px 4px 3px rgba(0, 0, 0, 0.4)" },
          popover: {
            value: "0px 10px 38px -10px rgba(22, 23, 24, 0.35), 0px 10px 20px -15px rgba(22, 23, 24, 0.2)",
          },
          surface: {
            edge: { value: "inset 0 0 0 2px var(--ds-surface-edge)" },
            elevated: {
              edge: { value: "inset 0 0 0 2px var(--ds-surface-elevated-edge)" },
            },
          },
          control: {
            edge: { value: "inset 0 0 0 1px var(--ds-control-edge)" },
          },
          accent: {
            edge: { value: "inset 0 0 0 1px var(--ds-accent-edge)" },
          },
        },
      },

      semanticTokens: {
        spacing: {
          "0-5": { value: "0.125rem" },
          "1": { value: "0.25rem" },
          "1-5": { value: "0.375rem" },
          "2": { value: { base: "0.5rem", _compact: "0.375rem" } },
          "3": { value: { base: "0.75rem", _compact: "0.5rem" } },
          "4": { value: { base: "1rem", _compact: "0.75rem" } },
          "5": { value: { base: "1.25rem", _compact: "1rem" } },
          "6": { value: { base: "1.5rem", _compact: "1.125rem" } },
          "7": { value: { base: "1.75rem", _compact: "1.375rem" } },
          "8": { value: { base: "2rem", _compact: "1.5rem" } },
          "9": { value: { base: "2.25rem", _compact: "1.75rem" } },
          "12": { value: { base: "3rem", _compact: "2.25rem" } },
          "16": { value: { base: "4rem", _compact: "3rem" } },
        },

        // Colors aren't known at build time — injected at runtime as --ds-* vars by the design
        // system (src/design-system/apply.ts). Panda only needs the names; values resolve at runtime.
        colors: {
          frosted: {
            DEFAULT: { value: "var(--ds-frosted)" },
            subtle: { value: "var(--ds-frosted-subtle)" },
            strong: { value: "var(--ds-frosted-strong)" },
          },
          divider: { value: "var(--ds-divider)" },
          ghost: {
            hover: { value: "var(--ds-ghost-hover)" },
          },
          scrollbar: {
            thumb: { value: "var(--ds-scrollbar-thumb)" },
          },
          surface: {
            DEFAULT: { value: "var(--ds-surface)" },
            edge: { value: "var(--ds-surface-edge)" },
            elevated: {
              DEFAULT: { value: "var(--ds-surface-elevated)" },
              edge: { value: "var(--ds-surface-elevated-edge)" },
            },
          },
          control: {
            DEFAULT: { value: "var(--ds-control)" },
            border: { value: "var(--ds-control-border)" },
            edge: { value: "var(--ds-control-edge)" },
            hover: { value: "var(--ds-control-hover)" },
            disabled: { value: "var(--ds-control-disabled)" },
          },
          accent: {
            DEFAULT: { value: "var(--ds-accent)" },
            border: { value: "var(--ds-accent-border)" },
            edge: { value: "var(--ds-accent-edge)" },
            hover: { value: "var(--ds-accent-hover)" },
            disabled: { value: "var(--ds-accent-disabled)" },
          },
          "on-accent": {
            DEFAULT: { value: "var(--ds-on-accent)" },
            disabled: { value: "var(--ds-on-accent-disabled)" },
          },
          icon: {
            DEFAULT: { value: "var(--ds-icon)" },
            subtle: { value: "var(--ds-icon-subtle)" },
          },
          tooltip: { value: "rgba(0, 0, 0, 0.82)" },
          "on-tooltip": { value: "white" },
          text: {
            primary: { value: "var(--ds-text-primary)" },
            subtle: { value: "var(--ds-text-subtle)" },
            placeholder: { value: "var(--ds-text-placeholder)" },
            disabled: { value: "var(--ds-text-disabled)" },
          },
        },
      },
    },
  },

  globalFontface: {
    Nunito: {
      src: "url('/assets/Nunito.ttf') format('truetype-variations')",
      fontWeight: "1 999",
      fontDisplay: "swap",
    },
  },

  globalCss: {
    html: { fontSize: "1rem" },
    "*": { margin: 0, boxSizing: "border-box", border: "none", background: "none", padding: 0 },
    body: {
      // Chrome injects an *unlayered* stylesheet into extension pages (`body { font-family: system-ui;
      // font-size: 75% }`). Unlayered styles beat any @layer, so font-family + font-size need
      // `!important` (important author declarations outrank normal ones regardless of layer) for our
      // base to win; the rest isn't in Chrome's rule and applies normally.
      fontFamily:
        "'Nunito', BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif !important",
      WebkitFontSmoothing: "antialiased",
      MozOsxFontSmoothing: "grayscale",
      textRendering: "optimizeLegibility",
      lineHeight: "1.65",
      letterSpacing: "0.075rem",
      color: "token(colors.text.primary)",
      fontSize: "1rem !important",
    },
    "button, input": { fontSize: "inherit", color: "inherit", letterSpacing: "inherit", fontFamily: "inherit" },
    "h1, h2, h3, h4, h5, h6": { fontWeight: "light" },
    h1: { fontSize: "2xl" },
    h2: { fontSize: "xl" },
    h3: { fontSize: "lg" },
    h4: { fontSize: "base" },
    h5: { fontSize: "sm" },
    h6: { fontSize: "xs" },
    "a, a:visited": { color: "inherit" },
  },
});
