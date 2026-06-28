import { round } from "@anori/utils/misc";
import { APCAcontrast, sRGBtoY } from "apca-w3";
import { clampChroma, converter } from "culori";

// Color engine for generating palettes based on single hue+chroma. Three tiers:
//   1. a continuous OKLCH generator (the curve) — not referenced directly,
//   2. a fixed numbered primitive scale sampled from it (role-agnostic, index 0..N),
//   3. semantic tokens that map names → a primitive index (the only thing the UI uses).
// Input: an accent color (OKLCH) + a light/dark mode. Output: primitive scales + semantic tokens.

export type Mode = "light" | "dark";
export type Gamut = "rgb" | "p3";
export type OklchInput = { l: number; c: number; h: number };

export type Palette = {
  mode: Mode;
  scales: Record<ScaleName, string[]>;
  tokens: Record<string, string>;
};

export type ScaleName = "neutral" | "surface" | "accent" | "danger" | "warning" | "success" | "info";

export const detectGamut = (): Gamut =>
  typeof window !== "undefined" && window.matchMedia?.("(color-gamut: p3)").matches ? "p3" : "rgb";

// Per-lightness chroma multiplier — peaks in the mid-tones, falls to 0 at black/white so saturated
// near-extremes (which aren't displayable) stay in gamut.
const chromaWeight = (l: number) => Math.sin(Math.PI * l) ** 0.6;

const fmt = (l: number, c: number, h: number, gamut: Gamut): string => {
  const clamped = clampChroma({ mode: "oklch", l, c, h }, "oklch", gamut);
  return `oklch(${round(clamped.l ?? l, 4)} ${round(clamped.c ?? c, 4)} ${round(clamped.h ?? h ?? 0, 2)})`;
};

// One colour on a family's curve: its hue at a lightness, chroma tapered by chromaWeight.
export const colorAt = (hue: number, chroma: number, l: number, gamut: Gamut): string =>
  fmt(l, chroma * chromaWeight(l), hue, gamut);

// Tier 2 — the lightness of each numbered step; tier-3 tokens reference these by index.
const PRIMITIVE_LS = [0.16, 0.22, 0.31, 0.35, 0.38, 0.45, 0.52, 0.61, 0.7, 0.78, 0.82, 0.87, 0.91, 0.98];
//                     0     1     2     3     4     5     6     7     8    9     10    11    12    13
export const PRIMITIVE_STEPS = PRIMITIVE_LS.length;

const scale = (hue: number, chroma: number, gamut: Gamut): string[] =>
  PRIMITIVE_LS.map((l) => colorAt(hue, chroma, l, gamut));

// `neutral`/`surface` are tinted greys: the accent hue at a low, capped chroma. The tint fades above
// L 0.6 (down to 30%) so light steps don't pick up an obvious colour cast.
const NEUTRAL_CHROMA = 0.045;
const SURFACE_CHROMA = 0.09;
const tintFade = (l: number) => (l <= 0.6 ? 1 : 1 - ((l - 0.6) / (0.98 - 0.6)) * 0.7);
const tintedColorAt = (hue: number, chroma: number, l: number, gamut: Gamut): string =>
  colorAt(hue, chroma * tintFade(l), l, gamut);
const tintedScale = (hue: number, chroma: number, gamut: Gamut): string[] =>
  PRIMITIVE_LS.map((l) => tintedColorAt(hue, chroma, l, gamut));

const byMode = (mode: Mode, dark: number, light: number) => (mode === "dark" ? dark : light);

const toRgb = converter("rgb");
const clamp255 = (v: number) => Math.round(Math.min(1, Math.max(0, v)) * 255);
const apcaY = (color: string): number => {
  const c = toRgb(color);
  return sRGBtoY([clamp255(c?.r ?? 0), clamp255(c?.g ?? 0), clamp255(c?.b ?? 0)]);
};

// Picks whichever of `light`/`dark` has the higher APCA contrast on `fill` (a legible foreground).
const bestTextOn = (fill: string, light: string, dark: string): string => {
  const bgY = apcaY(fill);
  const lcLight = Math.abs(Number(APCAcontrast(apcaY(light), bgY)));
  const lcDark = Math.abs(Number(APCAcontrast(apcaY(dark), bgY)));
  return lcLight >= lcDark ? light : dark;
};

// Sub-step deltas: fractions of a primitive step, for relational shades (hover/edge/bump) that need to
// land between two numbered stops.
const HOVER_DELTA = 0.03;
const EDGE_DELTA = 0.02;
const CONTROL_EDGE_LIGHT_DELTA = 0.065;
const CONTROL_EDGE_DARK_DELTA = 0.04;
const CONTROL_BUMP_DARK_DELTA = 0.045;
const CONTROL_BUMP_LIGHT_DELTA = 0.03;

// Re-samples a family at `baseL + delta`. Callers sign the delta per mode — `byMode(mode, d, -d)` gives
// the usual "lighter in dark, darker in light".
const shade = (sampleAt: (l: number) => string, baseL: number, delta: number): string => sampleAt(baseL + delta);

const withAlpha = (oklch: string, alpha: number): string => oklch.replace(/\)\s*$/, ` / ${alpha})`);

export function buildPalette(accentColor: OklchInput, mode: Mode, gamut: Gamut): Palette {
  const scales: Record<ScaleName, string[]> = {
    neutral: tintedScale(accentColor.h, Math.min(accentColor.c, NEUTRAL_CHROMA), gamut),
    surface: tintedScale(accentColor.h, Math.min(accentColor.c, SURFACE_CHROMA), gamut),
    accent: scale(accentColor.h, accentColor.c, gamut),
    danger: scale(25, 0.16, gamut),
    warning: scale(75, 0.15, gamut),
    success: scale(150, 0.13, gamut),
    info: scale(255, 0.14, gamut),
  };

  const { neutral, surface, accent } = scales;
  const surfaceChroma = Math.min(accentColor.c, SURFACE_CHROMA);
  const sampleSurface = (l: number) => tintedColorAt(accentColor.h, surfaceChroma, l, gamut);
  const sampleAccent = (l: number) => colorAt(accentColor.h, accentColor.c, l, gamut);
  // Tier 3 — each role picks a primitive index, flipped per mode
  const surfaceIdx = byMode(mode, 4, 12);
  const accentFillIdx = byMode(mode, 7, 7);
  // Controls sit a fraction of a step above the surface — a raised bump, off the numbered scale.
  const controlL = PRIMITIVE_LS[surfaceIdx] + byMode(mode, CONTROL_BUMP_DARK_DELTA, CONTROL_BUMP_LIGHT_DELTA);
  const accentFill = accent[accentFillIdx];
  // Desaturated accent for disabled fills.
  const accentDisabled = colorAt(accentColor.h, accentColor.c * 0.4, PRIMITIVE_LS[accentFillIdx], gamut);

  const tokens: Record<string, string> = {
    surface: surface[surfaceIdx],
    "surface-edge": shade(sampleSurface, PRIMITIVE_LS[surfaceIdx], byMode(mode, EDGE_DELTA, -EDGE_DELTA)),
    "surface-elevated": sampleSurface(controlL),
    "surface-elevated-edge": shade(
      sampleSurface,
      controlL,
      byMode(mode, CONTROL_EDGE_DARK_DELTA, -CONTROL_EDGE_LIGHT_DELTA),
    ),
    "surface-elevated-border": accent[byMode(mode, 6, 7)],

    control: sampleSurface(controlL),
    "control-border": neutral[byMode(mode, 6, 8)],
    "control-edge": shade(sampleSurface, controlL, byMode(mode, CONTROL_EDGE_DARK_DELTA, -CONTROL_EDGE_LIGHT_DELTA)),
    "control-hover": shade(sampleSurface, controlL, HOVER_DELTA),
    "control-disabled": tintedColorAt(accentColor.h, surfaceChroma * 0.5, controlL, gamut),

    accent: accentFill,
    "on-accent": bestTextOn(accentFill, neutral[13], neutral[0]),
    "accent-border": accent[byMode(mode, 7, 5)],
    "accent-edge": shade(sampleAccent, PRIMITIVE_LS[accentFillIdx], EDGE_DELTA * 1.5),
    "accent-hover": shade(sampleAccent, PRIMITIVE_LS[accentFillIdx], HOVER_DELTA),
    "accent-disabled": accentDisabled,
    "on-accent-disabled": bestTextOn(accentDisabled, neutral[11], neutral[2]),
    "shortcut-shadow": accent[byMode(mode, 5, 4)],

    "text-primary": neutral[byMode(mode, 13, 1)],
    "text-subtle": neutral[byMode(mode, 11, 5)],
    "text-placeholder": neutral[byMode(mode, 9, 7)],
    "text-disabled": neutral[byMode(mode, 7, 7)],
    icon: neutral[byMode(mode, 9, 6)],
    "icon-strong": neutral[byMode(mode, 11, 5)],
    "icon-subtle": withAlpha(neutral[byMode(mode, 9, 7)], 0.55),
    "icon-placeholder": neutral[byMode(mode, 13, 8)],

    "frosted-subtle": withAlpha(neutral[byMode(mode, 13, 11)], byMode(mode, 0.04, 0.1)),
    frosted: withAlpha(neutral[byMode(mode, 13, 11)], byMode(mode, 0.1, 0.2)),
    "frosted-strong": withAlpha(neutral[byMode(mode, 13, 10)], byMode(mode, 0.18, 0.3)),

    divider: withAlpha(neutral[byMode(mode, 13, 1)], 0.15),
    "ghost-hover": withAlpha(neutral[byMode(mode, 13, 0)], byMode(mode, 0.07, 0.05)),
    "scrollbar-thumb": withAlpha(neutral[byMode(mode, 13, 1)], 0.1),
  };

  return { mode, scales, tokens };
}

export const tokensToCssVars = (palette: Palette): Record<string, string> =>
  Object.fromEntries(Object.entries(palette.tokens).map(([k, v]) => [`--ds-${k}`, v]));
