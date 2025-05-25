import { type Color, fromHsl } from "@utils/color";
import "./ColorPicker.scss";
import clsx from "clsx";
import { useMemo } from "react";
import { HslColorPicker } from "react-colorful";

export type ColorPickerProps = {
  value: Color;
  onChange: (val: Color) => void;
  className?: string;
};

export const ColorPicker = ({ value: valueFromProps, onChange, className }: ColorPickerProps) => {
  const hslValue = useMemo(
    () => ({
      h: valueFromProps.hue * 360,
      l: valueFromProps.lightness * 100,
      s: valueFromProps.saturation * 100,
      a: valueFromProps.alpha,
    }),
    [valueFromProps],
  );

  return (
    <HslColorPicker
      className={clsx("ColorPicker", className)}
      color={hslValue}
      onChange={(color) => {
        onChange(fromHsl(color.h, color.s, color.l));
      }}
    />
  );
};
