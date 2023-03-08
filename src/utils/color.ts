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

export const toCss = (c: Color) => {
    // console.log('Converting color', c, 'to css', `hsl(${c.hue.toFixed(4)}turn ${(c.saturation * 100).toFixed(2)}% ${(c.lightness * 100).toFixed(2)}% / ${c.alpha})`);
    return `hsl(${c.hue.toFixed(4)}turn ${(c.saturation * 100).toFixed(2)}% ${(c.lightness * 100).toFixed(2)}% / ${c.alpha})`;
};