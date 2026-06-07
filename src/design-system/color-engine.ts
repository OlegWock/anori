import { APCAcontrast, sRGBtoY } from "apca-w3";
import { clampChroma, converter } from "culori";

// Throwaway color engine for the design-system prototype. Three tiers:
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

// ── Tier 1: the continuous generator (the curve) ─────────────────────────────────────────────
// Not referenced by tokens directly. Chroma is highest in the mid-tones and tapered toward the
// extremes so colors stay in gamut and the ends aren't muddy.
const chromaWeight = (l: number) => Math.sin(Math.PI * l) ** 0.6;

const round = (v: number, places: number) => Math.round(v * 10 ** places) / 10 ** places;

// Gamut-clamp, then emit a compact oklch() (rounded — culori's default has 10+ decimals).
const fmt = (l: number, c: number, h: number, gamut: Gamut): string => {
  const clamped = clampChroma({ mode: "oklch", l, c, h }, "oklch", gamut);
  return `oklch(${round(clamped.l ?? l, 4)} ${round(clamped.c ?? c, 4)} ${round(clamped.h ?? h ?? 0, 2)})`;
};

// A family's color at *any* lightness — the escape hatch. If a genuine gap appears, sample the
// curve here and add it as a primitive stop, rather than letting semantics drift to arbitrary values.
export const colorAt = (hue: number, chroma: number, l: number, gamut: Gamut): string =>
  fmt(l, chroma * chromaWeight(l), hue, gamut);

// ── Tier 2: the fixed numbered primitive scale ───────────────────────────────────────────────
// The curve sampled at these lightnesses → role-agnostic stops (index 0..11, "step 1..12"). Tier-3
// semantics reference these by index only. Densifying = add a stop here (cheap, since generated).
const PRIMITIVE_LS = [0.16, 0.22, 0.28, 0.35, 0.43, 0.52, 0.61, 0.7, 0.78, 0.86, 0.93, 0.98];
export const PRIMITIVE_STEPS = PRIMITIVE_LS.length;

const scale = (hue: number, chroma: number, gamut: Gamut): string[] =>
  PRIMITIVE_LS.map((l) => colorAt(hue, chroma, l, gamut));

// A tinted-grey scale: the accent hue at a (capped) chroma, with the tint fading out on the lighter
// steps (≈ step 7 up) so light tones aren't over-tinted. Used for both the low-chroma `neutral`
// family (text/borders) and the more-saturated `surface` family (filled surfaces + controls).
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

// Picks the text candidate (light vs dark) with the most perceptual contrast on `fill`, per APCA.
const bestTextOn = (fill: string, light: string, dark: string): string => {
  const bgY = apcaY(fill);
  const lcLight = Math.abs(Number(APCAcontrast(apcaY(light), bgY)));
  const lcDark = Math.abs(Number(APCAcontrast(apcaY(dark), bgY)));
  return lcLight >= lcDark ? light : dark;
};

// The one sanctioned off-scale derivation (see design-system-rules.md DS-2): a fill nudged a
// *sub-step* toward more contrast (lighter in dark, darker in light) — finer than a numbered step.
// Used for hover states and for subtle edges that need to sit between two steps. `sampleAt` is the
// family's curve sampler (bound to its hue/chroma/gamut).
const HOVER_DELTA = 0.03;
const EDGE_DELTA = 0.02;
const shade = (sampleAt: (l: number) => string, baseL: number, mode: Mode, delta: number): string =>
  sampleAt(baseL + (mode === "dark" ? delta : -delta));

export function buildPalette(accentColor: OklchInput, mode: Mode, gamut: Gamut): Palette {
  // Tier 2 — build each family's primitive scale by sampling the curve.
  const scales: Record<ScaleName, string[]> = {
    // Both carry the accent's hue (no separate background color): `neutral` at a low chroma →
    // "colored grays" for text/borders; `surface` at a higher chroma → brand-tinted fills.
    neutral: tintedScale(accentColor.h, Math.min(accentColor.c, NEUTRAL_CHROMA), gamut),
    surface: tintedScale(accentColor.h, Math.min(accentColor.c, SURFACE_CHROMA), gamut),
    accent: scale(accentColor.h, accentColor.c, gamut),
    danger: scale(25, 0.16, gamut),
    warning: scale(75, 0.15, gamut),
    success: scale(150, 0.13, gamut),
    info: scale(255, 0.14, gamut),
  };

  // ── Tier 3: semantic tokens (name → primitive index, flipping per mode) ──
  const { neutral, surface, accent } = scales;
  const surfaceChroma = Math.min(accentColor.c, SURFACE_CHROMA);
  const sampleSurface = (l: number) => tintedColorAt(accentColor.h, surfaceChroma, l, gamut);
  const sampleAccent = (l: number) => colorAt(accentColor.h, accentColor.c, l, gamut);
  const surfaceIdx = byMode(mode, 4, 11);
  const elevatedIdx = byMode(mode, 4, 10);
  const accentFillIdx = byMode(mode, 6, 5);
  const controlIdx = byMode(mode, 5, 10);
  const accentFill = accent[accentFillIdx];

  const tokens: Record<string, string> = {
    // Brand-tinted fills come from the `surface` family; text + borders stay on the neutral family.
    surface: surface[surfaceIdx],
    // An *edge*, not a border (DS-3): a barely-there sub-step shade that gives the surface volume —
    // lighter in dark, darker in light, on the tinted family so it matches the fill.
    "surface-edge": shade(sampleSurface, PRIMITIVE_LS[surfaceIdx], mode, EDGE_DELTA),
    // Elevated surface (popovers, dropdowns, modals) — a step lighter than `surface` in dark mode,
    // with its own matching edge.
    "surface-elevated": surface[elevatedIdx],
    "surface-elevated-edge": shade(sampleSurface, PRIMITIVE_LS[elevatedIdx], mode, EDGE_DELTA),

    // Filled control (e.g. the secondary button) — one step lighter than `surface` in dark mode, on
    // the same tinted family. `border` delineates it (DS-3); `edge` is its inset volume highlight.
    control: surface[controlIdx],
    "control-border": neutral[byMode(mode, 5, 9)],
    "control-edge": shade(sampleSurface, PRIMITIVE_LS[controlIdx], mode, EDGE_DELTA),
    "control-hover": shade(sampleSurface, PRIMITIVE_LS[controlIdx], mode, HOVER_DELTA),
    // Disabled secondary — a muted (low-chroma) shade of the control family, not surface.
    "control-disabled": tintedColorAt(accentColor.h, surfaceChroma * 0.5, PRIMITIVE_LS[controlIdx], gamut),

    accent: accentFill,
    // Text on the accent fill — APCA picks the more legible of the neutral extremes.
    "accent-text": bestTextOn(accentFill, neutral[11], neutral[0]),
    // A touch lighter than the fill in dark mode, darker in light mode — a delineating border.
    "accent-border": accent[byMode(mode, 6, 4)],
    "accent-edge": shade(sampleAccent, PRIMITIVE_LS[accentFillIdx], mode, EDGE_DELTA * 1.5),
    "accent-hover": shade(sampleAccent, PRIMITIVE_LS[accentFillIdx], mode, HOVER_DELTA),
    // Disabled primary — a muted (desaturated) shade of the accent family, not surface.
    "accent-disabled": colorAt(accentColor.h, accentColor.c * 0.4, PRIMITIVE_LS[accentFillIdx], gamut),

    "text-primary": neutral[byMode(mode, 11, 1)],
    "text-subtle": neutral[byMode(mode, 9, 4)],
    "text-placeholder": neutral[byMode(mode, 7, 6)],
    "text-disabled": neutral[byMode(mode, 6, 7)],
  };

  return { mode, scales, tokens };
}

export const tokensToCssVars = (palette: Palette): Record<string, string> =>
  Object.fromEntries(Object.entries(palette.tokens).map(([k, v]) => [`--ds-${k}`, v]));
