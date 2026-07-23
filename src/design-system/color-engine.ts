import { clampChroma, toRgb } from "@anori/utils/color";
import { round } from "@anori/utils/misc";
import { APCAcontrast, sRGBtoY } from "apca-w3";

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
const tintedColorAt = (hue: number, chroma: number, l: number, gamut: Gamut, fadeRelax = 0): string =>
  colorAt(hue, chroma * (tintFade(l) + (1 - tintFade(l)) * fadeRelax), l, gamut);
const tintedScale = (hue: number, chroma: number, gamut: Gamut, fadeRelax = 0): string[] =>
  PRIMITIVE_LS.map((l) => tintedColorAt(hue, chroma, l, gamut, fadeRelax));

const SURFACE_L_BANDS: Record<Mode, { min: number; def: number; max: number }> = {
  dark: { min: 0, def: 0.38, max: 0.72 },
  light: { min: 0.8, def: 0.91, max: 0.96 },
};

const resolveSurfaceL = (mode: Mode, surfaceLightness: number): number => {
  const band = SURFACE_L_BANDS[mode];
  const t = Math.min(1, Math.max(0, surfaceLightness));
  return t <= 0.5 ? band.min + (t / 0.5) * (band.def - band.min) : band.def + ((t - 0.5) / 0.5) * (band.max - band.def);
};

export const clampAccentL = (l: number): number =>
  Math.min(SURFACE_L_BANDS.dark.max, Math.max(SURFACE_L_BANDS.dark.min, l));

export const accentLToBandPosition = (l: number): number => {
  const band = SURFACE_L_BANDS.dark;
  const cl = clampAccentL(l);
  return cl <= band.def
    ? ((cl - band.min) / (band.def - band.min)) * 0.5
    : 0.5 + ((cl - band.def) / (band.max - band.def)) * 0.5;
};

export const bandPositionToAccentL = (t: number): number => resolveSurfaceL("dark", t);

export const surfaceColorForLightness = (
  accent: OklchInput,
  mode: Mode,
  surfaceLightness: number,
  gamut: Gamut,
): string => {
  const surfaceL = resolveSurfaceL(mode, surfaceLightness);
  const shift = midtoneShift(mode, surfaceL);
  const surfaceChroma = Math.min(accent.c, SURFACE_CHROMA + shift * SURFACE_CHROMA_BOOST);
  return tintedColorAt(accent.h, surfaceChroma, surfaceL, gamut, shift);
};

const midtoneShift = (mode: Mode, surfaceL: number): number => {
  const band = SURFACE_L_BANDS[mode];
  return mode === "dark"
    ? Math.max(0, (surfaceL - band.def) / (band.max - band.def))
    : Math.max(0, (band.def - surfaceL) / (band.def - band.min));
};
const SURFACE_CHROMA_BOOST = 0.06;
const NEUTRAL_CHROMA_BOOST = 0.045;

const byMode = (mode: Mode, dark: number, light: number) => (mode === "dark" ? dark : light);

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
const ELEVATED_BUMP_DARK_DELTA = 0.03;
const ELEVATED_BUMP_LIGHT_DELTA = 0.024;
const CONTROL_BUMP_DARK_DELTA = 0.068;
const CONTROL_BUMP_LIGHT_DELTA = 0.048;

// Re-samples a family at `baseL + delta`. Callers sign the delta per mode — `byMode(mode, d, -d)` gives
// the usual "lighter in dark, darker in light".
const shade = (sampleAt: (l: number) => string, baseL: number, delta: number): string => sampleAt(baseL + delta);

// Displays crush dark tones: a ΔL that reads fine at mid lightness becomes invisible near black, so
// surface-relative deltas scale up as the surface drops below this threshold (up to ~2.8× at L 0).
const CRUSH_COMP_START_L = 0.3;
const CRUSH_COMP_STRENGTH = 1.8;
const crushCompensation = (surfaceL: number): number =>
  1 + CRUSH_COMP_STRENGTH * Math.max(0, (CRUSH_COMP_START_L - surfaceL) / CRUSH_COMP_START_L) ** 1.5;

const withAlpha = (oklch: string, alpha: number): string => oklch.replace(/\)\s*$/, ` / ${alpha})`);

export function buildPalette(accentColor: OklchInput, mode: Mode, gamut: Gamut): Palette {
  const surfaceL = resolveSurfaceL(mode, accentLToBandPosition(accentColor.l));
  const shift = midtoneShift(mode, surfaceL);
  const surfaceChroma = Math.min(accentColor.c, SURFACE_CHROMA + shift * SURFACE_CHROMA_BOOST);
  const neutralChroma = Math.min(accentColor.c, NEUTRAL_CHROMA + shift * NEUTRAL_CHROMA_BOOST);

  const scales: Record<ScaleName, string[]> = {
    neutral: tintedScale(accentColor.h, neutralChroma, gamut, shift),
    surface: tintedScale(accentColor.h, surfaceChroma, gamut, shift),
    accent: scale(accentColor.h, accentColor.c, gamut),
    danger: scale(25, 0.16, gamut),
    warning: scale(75, 0.15, gamut),
    success: scale(150, 0.13, gamut),
    info: scale(255, 0.14, gamut),
  };

  const { neutral, surface, accent, success, danger } = scales;
  const sampleSurface = (l: number) => tintedColorAt(accentColor.h, surfaceChroma, l, gamut, shift);
  const sampleAccent = (l: number) => colorAt(accentColor.h, accentColor.c, l, gamut);
  const defL = SURFACE_L_BANDS[mode].def;
  const fgCompress = mode === "dark" && surfaceL > defL ? (0.98 - surfaceL) / (0.98 - defL) : 1;
  const fgNeutral = (darkIdx: number, lightIdx: number) => {
    const l = PRIMITIVE_LS[byMode(mode, darkIdx, lightIdx)];
    const remapped = fgCompress === 1 || l <= defL ? l : surfaceL + (l - defL) * fgCompress;
    return tintedColorAt(accentColor.h, neutralChroma, remapped, gamut, shift);
  };
  // Tier 3 — each role picks a primitive index, flipped per mode
  // Code blocks use a dark fill in both modes so code reads as a distinct block against the page surface.
  const codeIdx = byMode(mode, 2, 2);
  const accentFillIdx = byMode(mode, 7, 7);
  // Elevated panels sit a hair above the surface; controls sit higher still, so a control stays distinct
  // even placed on an elevated panel. Both are sub-step bumps off the numbered scale.
  const deltaBoost = mode === "dark" ? crushCompensation(surfaceL) : 1;
  const elevatedL = surfaceL + byMode(mode, ELEVATED_BUMP_DARK_DELTA, ELEVATED_BUMP_LIGHT_DELTA) * deltaBoost;
  const controlL = surfaceL + byMode(mode, CONTROL_BUMP_DARK_DELTA, CONTROL_BUMP_LIGHT_DELTA) * deltaBoost;
  const accentFillL =
    mode === "dark" && surfaceL < defL
      ? surfaceL + (PRIMITIVE_LS[accentFillIdx] - defL) * ((0.98 - surfaceL) / (0.98 - defL))
      : PRIMITIVE_LS[accentFillIdx];
  const accentFill = sampleAccent(accentFillL);
  // Desaturated accent for disabled fills.
  const accentDisabled = colorAt(accentColor.h, accentColor.c * 0.4, accentFillL, gamut);

  const tokens: Record<string, string> = {
    surface: sampleSurface(surfaceL),
    "surface-edge": shade(sampleSurface, surfaceL, byMode(mode, EDGE_DELTA, -EDGE_DELTA) * deltaBoost),
    "surface-elevated": sampleSurface(elevatedL),
    "surface-elevated-edge": shade(
      sampleSurface,
      elevatedL,
      byMode(mode, CONTROL_EDGE_DARK_DELTA, -CONTROL_EDGE_LIGHT_DELTA) * deltaBoost,
    ),
    "surface-elevated-border": accent[byMode(mode, 6, 7)],

    code: surface[codeIdx],
    "on-code": bestTextOn(surface[codeIdx], neutral[13], neutral[0]),

    control: sampleSurface(controlL),
    "control-border": neutral[byMode(mode, 6, 8)],
    "control-edge": shade(
      sampleSurface,
      controlL,
      byMode(mode, CONTROL_EDGE_DARK_DELTA, -CONTROL_EDGE_LIGHT_DELTA) * deltaBoost,
    ),
    "control-hover": shade(sampleSurface, controlL, HOVER_DELTA * deltaBoost),
    "control-disabled": tintedColorAt(accentColor.h, surfaceChroma * 0.5, controlL, gamut),

    accent: accentFill,
    "on-accent": bestTextOn(accentFill, neutral[13], neutral[0]),
    "accent-border": accent[byMode(mode, 7, 5)],
    "accent-edge": shade(sampleAccent, accentFillL, EDGE_DELTA * 1.5),
    "accent-hover": shade(sampleAccent, accentFillL, HOVER_DELTA),
    "accent-disabled": accentDisabled,
    "on-accent-disabled": bestTextOn(accentDisabled, neutral[11], neutral[2]),
    "shortcut-shadow": accent[byMode(mode, 5, 4)],

    "text-primary": fgNeutral(13, 1),
    "text-subtle": fgNeutral(11, 5),
    "text-placeholder": fgNeutral(9, 7),
    "text-disabled": fgNeutral(7, 7),
    icon: fgNeutral(9, 6),
    "icon-strong": fgNeutral(11, 5),
    "icon-subtle": withAlpha(fgNeutral(9, 7), 0.55),
    "icon-placeholder": fgNeutral(13, 8),

    // Fixed-hue status colours, constant across modes — their meaning shouldn't shift with the theme.
    "status-up": success[7],
    "status-down": danger[7],
    notification: danger[7],

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
