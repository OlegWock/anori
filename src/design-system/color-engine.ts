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
// The curve sampled at these lightnesses → role-agnostic stops (index 0..13). Tier-3 semantics
// reference these by index only. Densifying = add a stop here, then re-map the indices below.
// (Index 10 = 0.82 was inserted between the old 9/10 to densify the light end; everything from the old
// step 10 up shifted one higher, so old-10/11/12 are now 11/12/13.)
const PRIMITIVE_LS = [0.16, 0.22, 0.31, 0.35, 0.38, 0.45, 0.52, 0.61, 0.7, 0.78, 0.82, 0.87, 0.91, 0.98];
//                     0     1     2     3     4     5     6     7     8    9    10    11    12    13
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

// Sub-step deltas (see design-system-rules.md DS-2): a fill nudged a *fraction* of a step off a base, finer
// than a numbered stop — for hover states and subtle edges. `shade` adds a *signed* delta; the caller signs
// it per mode: `byMode(mode, d, -d)` for the usual "lighter in dark, darker in light", or a positive
// constant for an always-lighter raised lift (popovers, the accent button). `sampleAt` is the family's curve
// sampler (bound to its hue/chroma/gamut).
const HOVER_DELTA = 0.03;
const EDGE_DELTA = 0.02;
// Control edges go a touch deeper than the generic edge in light mode, so the inset ring stays defined
// against the lighter control fill. Dark mode keeps the standard EDGE_DELTA lift.
const CONTROL_EDGE_LIGHT_DELTA = 0.065;
const CONTROL_EDGE_DARK_DELTA = 0.04;
const shade = (sampleAt: (l: number) => string, baseL: number, delta: number): string => sampleAt(baseL + delta);

// Adds an alpha channel to an emitted oklch() string → a translucent overlay.
const withAlpha = (oklch: string, alpha: number): string => oklch.replace(/\)\s*$/, ` / ${alpha})`);

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
  // Two genuinely separate filled surfaces (off the same tinted `surface` scale): `card` (lighter)
  // and `modal` (darker, so dialogs read deeper / more focused). `elevated` stays for raised UI
  // (dropdowns/popovers).
  // Light mode deliberately runs greener/darker than a naive "near-white surfaces" scheme so filled
  // surfaces don't fight the (often green/colourful) photo background: cards sit a couple steps off pure
  // white, modals stay the lightest/cleanest surface (it's a focused dialog), and controls/alerts go a few
  // steps darker so they read as saturated fills rather than washed-out near-white boxes.
  const cardIdx = byMode(mode, 4, 12);
  const modalIdx = byMode(mode, 2, 10);
  const elevatedIdx = byMode(mode, 4, 12);
  const accentFillIdx = byMode(mode, 7, 7);
  const controlIdx = byMode(mode, 3, 11);
  const accentFill = accent[accentFillIdx];
  const accentDisabled = colorAt(accentColor.h, accentColor.c * 0.4, PRIMITIVE_LS[accentFillIdx], gamut);

  const tokens: Record<string, string> = {
    // Filled surfaces (card, modal, control) sign their edge delta per mode — lighter in dark, but *darker*
    // in light — so they read as softly inset panels rather than raised boxes in light mode. The always-
    // lighter lift (a positive delta) is reserved for floating elements (popovers, the accent button).
    card: surface[cardIdx],
    "card-edge": shade(sampleSurface, PRIMITIVE_LS[cardIdx], byMode(mode, EDGE_DELTA, -EDGE_DELTA)),
    // Modal/dialog fill — its own matching (inset) edge.
    modal: surface[modalIdx],
    "modal-edge": shade(sampleSurface, PRIMITIVE_LS[modalIdx], byMode(mode, EDGE_DELTA, -EDGE_DELTA)),
    // Elevated surface (popovers, dropdowns) — a step lighter than the card in dark mode.
    "surface-elevated": surface[elevatedIdx],
    "surface-elevated-edge": shade(sampleSurface, PRIMITIVE_LS[elevatedIdx], EDGE_DELTA),

    // Filled control (inputs, secondary button) on the tinted family. `border` delineates it (DS-3);
    // `edge` is its inset volume highlight.
    control: surface[controlIdx],
    "control-border": neutral[byMode(mode, 6, 8)],
    // "control-edge": shade(sampleSurface, PRIMITIVE_LS[controlIdx], byMode(mode, EDGE_DELTA, -CONTROL_EDGE_LIGHT_DELTA)),
    "control-edge": shade(
      sampleSurface,
      PRIMITIVE_LS[controlIdx],
      byMode(mode, CONTROL_EDGE_DARK_DELTA, -CONTROL_EDGE_LIGHT_DELTA),
    ),
    "control-hover": shade(sampleSurface, PRIMITIVE_LS[controlIdx], HOVER_DELTA),
    // Disabled secondary — a muted (low-chroma) shade of the control family, not surface.
    "control-disabled": tintedColorAt(accentColor.h, surfaceChroma * 0.5, PRIMITIVE_LS[controlIdx], gamut),

    accent: accentFill,
    // `on-accent` family: foreground (text/icon) for content sitting on the accent fill — APCA picks
    // the more legible of the neutral extremes.
    "on-accent": bestTextOn(accentFill, neutral[13], neutral[0]),
    // A touch lighter than the fill in dark mode, darker in light mode — a delineating border.
    "accent-border": accent[byMode(mode, 7, 5)],
    "accent-edge": shade(sampleAccent, PRIMITIVE_LS[accentFillIdx], EDGE_DELTA * 1.5),
    "accent-hover": shade(sampleAccent, PRIMITIVE_LS[accentFillIdx], HOVER_DELTA),
    // Disabled primary — a muted (desaturated) shade of the accent family, not surface.
    "accent-disabled": accentDisabled,
    // Foreground on the disabled accent fill — subtle neutrals (not the active extremes), APCA-picked
    // so it stays legible in both modes.
    "on-accent-disabled": bestTextOn(accentDisabled, neutral[11], neutral[2]),
    // The shortcut key-cap's raised "side": a deliberately darker accent step (a couple steps below the
    // fill) — not the lighter `*-edge` lift — so the cap reads like a physical key. Specific to ShortcutHint.
    "shortcut-shadow": accent[byMode(mode, 5, 4)],

    "text-primary": neutral[byMode(mode, 13, 1)],
    "text-subtle": neutral[byMode(mode, 11, 5)],
    "text-placeholder": neutral[byMode(mode, 9, 7)],
    "text-disabled": neutral[byMode(mode, 7, 7)],
    // Glyph foreground for decorative/secondary icons: softer than text so a solid fill does not
    // out-weigh adjacent text (a touch dimmer than text in dark mode so big glyphs don't glare).
    icon: neutral[byMode(mode, 8, 6)],
    // An even quieter glyph — for large decorative icons (empty/error states) that should barely
    // register against the surface.
    "icon-subtle": withAlpha(neutral[byMode(mode, 9, 7)], 0.55),

    // Frosted overlays: text-primary at low alpha (so they adapt to mode) for translucent surfaces
    // over a backdrop blur — bookmarks bar/menus, and the frosted/ghost buttons.
    "frosted-subtle": withAlpha(neutral[byMode(mode, 13, 11)], byMode(mode, 0.04, 0.1)),
    frosted: withAlpha(neutral[byMode(mode, 13, 11)], byMode(mode, 0.1, 0.2)),
    "frosted-strong": withAlpha(neutral[byMode(mode, 13, 11)], byMode(mode, 0.18, 0.3)),

    // Hairline for dividers/separators. Matches the dark-mode frosted overlay (a faint light line),
    // but in light mode frosted lightens to stay readable on a blurred backdrop — too light to read as
    // a divider on a solid surface — so here it flips to a dark, low-alpha line instead.
    divider: withAlpha(neutral[byMode(mode, 13, 1)], 0.15),
  };

  return { mode, scales, tokens };
}

export const tokensToCssVars = (palette: Palette): Record<string, string> =>
  Object.fromEntries(Object.entries(palette.tokens).map(([k, v]) => [`--ds-${k}`, v]));
