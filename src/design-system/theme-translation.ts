import type { Color } from "@anori/utils/color";
import { converter } from "culori";
import type { OklchInput } from "./color-engine";

// Translation layer: keeps stored themes in their existing shape (HSL `Color`: hue in turns 0..1,
// saturation/lightness 0..1) while feeding the new OKLCH design system. Background keeps full L/C/H
// (its lightness drives mode + surfaces); accent's lightness is ignored downstream (the engine
// derives it), so only its hue + chroma carry over. Text color is discarded.

const toOklch = converter("oklch");

export const colorToOklch = (c: Color): OklchInput => {
  const o = toOklch({ mode: "hsl", h: c.hue * 360, s: c.saturation, l: c.lightness });
  return { l: o?.l ?? 0, c: o?.c ?? 0, h: o?.h ?? 0 };
};

export type ThemeInputs = { background: OklchInput; accent: OklchInput };

export const themeColorsToInputs = (colors: { accent: Color; background: Color }): ThemeInputs => ({
  background: colorToOklch(colors.background),
  accent: colorToOklch(colors.accent),
});
