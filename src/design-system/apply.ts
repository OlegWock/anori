import type { OklchColor } from "@anori/utils/color";
import { buildPalette, detectGamut, type Mode, type Palette, tokensToCssVars } from "./color-engine";

// Generates the design-system palette from the accent colour + the resolved light/dark mode and injects
// it onto the document root as `--ds-*` CSS variables. Returns the palette.
export const applyDesignSystemTokens = (accent: OklchColor, mode: Mode): Palette => {
  const palette = buildPalette(accent, mode, detectGamut());
  const root = document.documentElement;
  for (const [key, value] of Object.entries(tokensToCssVars(palette))) {
    root.style.setProperty(key, value);
  }

  return palette;
};
