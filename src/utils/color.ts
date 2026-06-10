import { converter } from "culori";

// Legacy HSL color, kept only for the stored-theme schema + its migration to OKLCH.
export type HslColor = {
  hue: number;
  saturation: number;
  lightness: number;
  alpha: number;
};

// OKLCH triplet (l 0..1, c chroma, h degrees). The design system's source-of-truth color shape.
export type OklchColor = { l: number; c: number; h: number };

const culoriToOklch = converter("oklch");

// Bridges a legacy stored HSL theme color to the OKLCH source of truth (used by the storage migration).
export const hslColorToOklch = (c: HslColor): OklchColor => {
  const o = culoriToOklch({ mode: "hsl", h: c.hue * 360, s: c.saturation, l: c.lightness });
  return { l: o?.l ?? 0, c: o?.c ?? 0, h: o?.h ?? 0 };
};
