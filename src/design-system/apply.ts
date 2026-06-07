import type { OklchColor } from "@anori/utils/color";
import { buildPalette, detectGamut, tokensToCssVars } from "./color-engine";

// Generates the new design-system tokens from the current theme's OKLCH colors and injects them onto
// the document root as `--ds-*` CSS variables, alongside the legacy `--accent`/`--background`/… vars.
// Components migrate to `--ds-*` gradually; the old system stays until the migration is complete.
// Only the accent (hue + chroma) is used directly; the background's lightness picks light vs dark.
export const applyDesignSystemTokens = (colors: { accent: OklchColor; background: OklchColor }) => {
  const mode = colors.background.l > 0.5 ? "light" : "dark";
  const palette = buildPalette(colors.accent, mode, detectGamut());
  const root = document.documentElement;
  for (const [key, value] of Object.entries(tokensToCssVars(palette))) {
    root.style.setProperty(key, value);
  }
};
