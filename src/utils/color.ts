// culori's main entry registers every color mode it knows, which is dead weight in the pre-paint
// theme script — register only what the app converts between. Conversion routes are resolved through
// the registry graph (oklch <-> oklab <-> lrgb <-> rgb, p3 <-> xyz65 <-> rgb) and string parsing uses
// each registered mode's CSS parser, so the intermediate modes must be registered too.
// culori's useMode is not a React hook — alias it so lint doesn't treat it as one.
import {
  modeHsl,
  modeLrgb,
  modeOklab,
  modeOklch,
  modeP3,
  modeRgb,
  modeXyz65,
  useMode as registerMode,
} from "culori/fn";

registerMode(modeHsl);
registerMode(modeLrgb);
registerMode(modeOklab);
registerMode(modeXyz65);

export const toRgb = registerMode(modeRgb);
export const toOklch = registerMode(modeOklch);
export const toP3 = registerMode(modeP3);

export { clampChroma, formatHex } from "culori/fn";

// Legacy HSL color, kept only for the stored-theme schema + its migration to OKLCH.
export type HslColor = {
  hue: number;
  saturation: number;
  lightness: number;
  alpha: number;
};

export type OklchColor = { l: number; c: number; h: number };

// Bridges a legacy stored HSL theme color to the OKLCH source of truth (used by the storage migration).
export const hslColorToOklch = (c: HslColor): OklchColor => {
  const o = toOklch({ mode: "hsl", h: c.hue * 360, s: c.saturation, l: c.lightness });
  return { l: o?.l ?? 0, c: o?.c ?? 0, h: o?.h ?? 0 };
};
