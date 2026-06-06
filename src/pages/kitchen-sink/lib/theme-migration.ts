import type { Color } from "@anori/utils/color";
import { type Theme, themes } from "@anori/utils/user-data/theme-base";
import { converter } from "culori";
import type { OklchInput } from "./color-engine";

const toOklch = converter("oklch");

// Current themes store colors as HSL (`Color`: hue in turns 0..1, saturation/lightness 0..1).
export const colorToOklch = (c: Color): OklchInput => {
  const o = toOklch({ mode: "hsl", h: c.hue * 360, s: c.saturation, l: c.lightness });
  return { l: o?.l ?? 0, c: o?.c ?? 0, h: o?.h ?? 0 };
};

export type ThemeInputs = { background: OklchInput; accent: OklchInput };

// Background keeps full L/C/H (its lightness drives mode + surfaces). Accent's lightness is ignored
// downstream — the engine derives it — so only its hue + chroma carry over. Works for built-in and
// custom themes alike (same `colors` shape).
export const themeColorsToInputs = (colors: { accent: Color; background: Color }): ThemeInputs => ({
  background: colorToOklch(colors.background),
  accent: colorToOklch(colors.accent),
});

export const themeToInputs = (theme: Theme): ThemeInputs => themeColorsToInputs(theme.colors);

export type ThemePreset = { name: string; image: string } & ThemeInputs;

export const builtinThemePresets: ThemePreset[] = themes.map((t) => ({
  name: t.name,
  image: t.type === "builtin" ? `/assets/images/backgrounds/${t.background}` : "",
  ...themeToInputs(t),
}));
