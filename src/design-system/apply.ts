import type { Color } from "@anori/utils/color";
import { buildPalette, detectGamut, tokensToCssVars } from "./color-engine";
import { themeColorsToInputs } from "./theme-translation";

// Generates the new design-system tokens from the current theme's colors and injects them onto the
// document root as `--ds-*` CSS variables, alongside the legacy `--accent`/`--background`/… vars.
// Components migrate to `--ds-*` gradually; the old system stays until the migration is complete.
export const applyDesignSystemTokens = (colors: { accent: Color; background: Color }) => {
  const { background, accent } = themeColorsToInputs(colors);
  const palette = buildPalette(background, accent, detectGamut());
  const root = document.documentElement;
  for (const [key, value] of Object.entries(tokensToCssVars(palette))) {
    root.style.setProperty(key, value);
  }
};
