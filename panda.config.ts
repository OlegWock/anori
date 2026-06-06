import { defineConfig } from "@pandacss/dev";

// biome-ignore lint/style/noDefaultExport: Required by Panda
export default defineConfig({
  // We already ship a reset in base.scss; don't let Panda's preflight fight it.
  preflight: false,

  include: ["./src/**/*.{ts,tsx}"],
  exclude: [],

  // Generate JSX patterns (Box, Flex, Stack, styled, …).
  jsxFramework: "react",

  // Namespace Panda's generated CSS vars (e.g. --ds-spacing-4) so they don't collide with the
  // legacy --spacing-* still declared in base.scss during the migration.
  prefix: "dsp",

  outdir: "styled-system",

  // Density: compact mode is toggled by `.compact-mode-active` on an ancestor (same class the legacy
  // app uses). Used as `_compact` in conditional token values below.
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

      // Static scales: actual values live here (Panda owns them). The legacy --spacing-*/--radius-*/
      // --font-size-* in base.scss go away once everything is migrated.
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
        // Light register, no bold (matches the audited app + the decision in design-system-notes).
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
        // Named layering ladder (replaces the ad-hoc 0/1/5/99/999/9999/… z-index war).
        zIndex: {
          base: { value: 0 },
          docked: { value: 100 },
          dropdown: { value: 1000 },
          modal: { value: 2000 },
          toast: { value: 3000 },
          tooltip: { value: 4000 },
          "app-cover": { value: 9000 },
        },
        // Elevation. `raised` = small floating affordances (e.g. widget edit controls); `overlay` =
        // an element lifted above its peers (e.g. a widget card being dragged/resized).
        shadows: {
          raised: { value: "rgba(0, 0, 0, 0.25) 0px 4px 6px 4px" },
          overlay: { value: "0px 4px 4px 3px rgba(0, 0, 0, 0.4)" },
        },
      },

      semanticTokens: {
        // Spacing is density-aware: `base` is the normal value, `_compact` compresses.
        // Compact values are a tunable first pass; small steps are left alone.
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
          surface: {
            DEFAULT: { value: "var(--ds-surface)" },
            border: { value: "var(--ds-surface-border)" },
            elevated: {
              DEFAULT: { value: "var(--ds-surface-elevated)" },
              border: { value: "var(--ds-surface-elevated-border)" },
            },
          },
          border: { value: "var(--ds-border)" },
          control: {
            DEFAULT: { value: "var(--ds-control)" },
            border: { value: "var(--ds-control-border)" },
            hover: { value: "var(--ds-control-hover)" },
          },
          accent: {
            DEFAULT: { value: "var(--ds-accent)" },
            text: { value: "var(--ds-accent-text)" },
            border: { value: "var(--ds-accent-border)" },
            hover: { value: "var(--ds-accent-hover)" },
          },
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
});
