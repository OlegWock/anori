import { clampChroma } from "culori";

// Throwaway color engine for the design-system prototype. Three tiers:
//   1. a continuous OKLCH generator (the curve) — not referenced directly,
//   2. a fixed numbered primitive scale sampled from it (role-agnostic, index 0..N),
//   3. semantic tokens that map names → a primitive index (the only thing the UI uses).
// Input: a background color + an accent color (OKLCH). Output: primitive scales + semantic tokens.

export type Mode = "light" | "dark";
export type Gamut = "rgb" | "p3";
export type OklchInput = { l: number; c: number; h: number };

export type Palette = {
  mode: Mode;
  scales: Record<ScaleName, string[]>;
  tokens: Record<string, string>;
};

export type ScaleName = "neutral" | "accent" | "danger" | "warning" | "success" | "info";

// Detects whether the current display can render the wider Display-P3 gamut.
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

const byMode = (mode: Mode, dark: number, light: number) => (mode === "dark" ? dark : light);

export function buildPalette(background: OklchInput, accent: OklchInput, gamut: Gamut): Palette {
  const mode: Mode = background.l > 0.5 ? "light" : "dark";

  // Tier 2 — build each family's primitive scale by sampling the curve.
  const scales: Record<ScaleName, string[]> = {
    // Neutral carries the background's hue at a low (tunable) chroma → "colored grays".
    neutral: scale(background.h, Math.min(background.c, 0.045), gamut),
    accent: scale(accent.h, accent.c, gamut),
    danger: scale(25, 0.16, gamut),
    warning: scale(75, 0.15, gamut),
    success: scale(150, 0.13, gamut),
    info: scale(255, 0.14, gamut),
  };

  // ── Tier 3: semantic tokens (name → primitive index, flipping per mode) ──
  const n = scales.neutral;

  const tokens: Record<string, string> = {
    "text-primary": n[byMode(mode, 11, 1)],
    "text-subtle": n[byMode(mode, 9, 4)],
    "text-placeholder": n[byMode(mode, 7, 6)],
    "text-disabled": n[byMode(mode, 6, 7)],
  };

  return { mode, scales, tokens };
}

export const tokensToCssVars = (palette: Palette): Record<string, string> =>
  Object.fromEntries(Object.entries(palette.tokens).map(([k, v]) => [`--ds-${k}`, v]));
