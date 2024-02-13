import { Color, fromHsl } from "@utils/color";
import './ColorPicker.scss';
import { HslColorPicker } from 'react-colorful';
import { useMemo } from "react";
import clsx from "clsx";

export type ColorPickerProps = {
    value: Color,
    onChange: (val: Color) => void;
    className?: string;
};

export const ColorPicker = ({ value: valueFromProps, onChange, className }: ColorPickerProps) => {
    const hslValue = useMemo(() => ({
        h: valueFromProps.hue * 360,
        l: valueFromProps.lightness * 100,
        s: valueFromProps.saturation * 100,
        a: valueFromProps.alpha,
    }), [valueFromProps]);

    return (<HslColorPicker className={clsx('ColorPicker', className)} color={hslValue} onChange={(color) => {
        onChange(fromHsl(color.h, color.s, color.l));
    }} />);
};