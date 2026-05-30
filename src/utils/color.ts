import { type HsvaColor, hexToHsva, hslaStringToHsva, hsvaToHsla, rgbaStringToHsva, validHex } from "@uiw/react-color";

export type Color = {
  // HSL
  hue: number;
  saturation: number;
  lightness: number;
  alpha: number;
};

const clamp = (val: number, min: number, max: number) => Math.min(max, Math.max(val, min));

export const darken = (c: Color, amount: number): Color => {
  return lighten(c, -amount);
};

export const lighten = (c: Color, amount: number): Color => {
  return {
    ...c,
    lightness: clamp(c.lightness + amount, 0, 1),
  };
};

export const transparentize = (c: Color, amount: number): Color => {
  return {
    ...c,
    alpha: clamp(c.alpha - amount, 0, 1),
  };
};

export const fromHsl = (hueDeg: number, saturationPer: number, lightnessPer: number, alpha = 1): Color => {
  return {
    hue: hueDeg / 360,
    saturation: saturationPer / 100,
    lightness: lightnessPer / 100,
    alpha,
  };
};

export const toHsl = (c: Color) => {
  return {
    hue: c.hue * 360,
    saturation: c.lightness * 100,
    lightness: c.saturation * 100,
    alpha: c.alpha,
  };
};

export const toCssHslValues = (c: Color) => {
  return `${c.hue.toFixed(4)}turn ${(c.saturation * 100).toFixed(2)}% ${(c.lightness * 100).toFixed(2)}%`;
};

export const toCss = (c: Color) => {
  return `hsl(${toCssHslValues(c)} / ${c.alpha})`;
};

const fromHsva = (hsva: HsvaColor): Color => {
  const { h, s, l, a } = hsvaToHsla(hsva);
  return fromHsl(h, s, l, a);
};

/**
 * Parses a CSS color string into a {@link Color}. Supports hex (`#rgb`, `#rgba`,
 * `#rrggbb`, `#rrggbbaa`, with or without the leading `#`), `rgb()`/`rgba()` and
 * `hsl()`/`hsla()` notations in both comma- and space-separated forms. Returns `null`
 * for unrecognized input. Conversion is delegated to `@uiw/react-color`; the regexes
 * below only detect/validate the notation, since the lib's rgb/hsl string parsers
 * silently fall back to black on invalid input.
 */
export const parseColor = (input: string): Color | null => {
  const trimmed = input.trim().toLowerCase();
  if (!trimmed) return null;

  // Hex with or without the leading `#` (incl. shorthand and alpha)
  const hexCandidate = trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
  if (validHex(hexCandidate)) {
    return fromHsva(hexToHsva(hexCandidate));
  }

  if (/^rgba?\(.+\)$/.test(trimmed)) {
    return fromHsva(rgbaStringToHsva(trimmed));
  }

  if (/^hsla?\(.+\)$/.test(trimmed)) {
    return fromHsva(hslaStringToHsva(trimmed));
  }

  return null;
};

export const toHexWithAlpha = (c: Color) => {
  if (c.alpha >= 1) return toHex(c);
  const alphaHex = Math.round(clamp(c.alpha, 0, 1) * 255)
    .toString(16)
    .padStart(2, "0");
  return `${toHex(c)}${alphaHex}`;
};

export const toHex = (c: Color) => {
  const h = c.hue * 360;
  const l = c.lightness * 100;
  const s = c.saturation * 100;

  const hDecimal = l / 100;
  const a = (s * Math.min(hDecimal, 1 - hDecimal)) / 100;
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = hDecimal - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);

    // Convert to Hex and prefix with "0" if required
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
};
