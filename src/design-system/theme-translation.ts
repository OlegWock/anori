import type { Color } from "@anori/utils/color";
import { converter } from "culori";
import type { Mode, OklchInput } from "./color-engine";

// Translation layer: keeps stored themes in their existing shape (HSL `Color`: hue in turns 0..1,
// saturation/lightness 0..1) while feeding the new OKLCH design system. Only the accent's hue +
// chroma carry over (the engine derives lightness). There's no separate background color anymore —
// the stored background's lightness only picks light vs dark. Text color is discarded.

const toOklch = converter("oklch");

export const colorToOklch = (c: Color): OklchInput => {
  const o = toOklch({ mode: "hsl", h: c.hue * 360, s: c.saturation, l: c.lightness });
  return { l: o?.l ?? 0, c: o?.c ?? 0, h: o?.h ?? 0 };
};

export type ThemeInputs = { accent: OklchInput; mode: Mode };

export const themeColorsToInputs = (colors: { accent: Color; background: Color }): ThemeInputs => ({
  accent: colorToOklch(colors.accent),
  mode: colorToOklch(colors.background).l > 0.5 ? "light" : "dark",
});
