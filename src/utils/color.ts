export type Color = {
    // HSL
    hue: number,
    saturation: number,
    lightness: number,
    alpha: number,
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
        alpha
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
}

export const toCss = (c: Color) => {
    return `hsl(${toCssHslValues(c)} / ${c.alpha})`;
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