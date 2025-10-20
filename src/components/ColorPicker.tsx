import { type Color, fromHsl } from "@anori/utils/color";
import "./ColorPicker.scss";
import { Colorful, hslaToHsva } from "@uiw/react-color";
import clsx from "clsx";
import { useMemo } from "react";

export type ColorPickerProps = {
  value: Color;
  onChange: (val: Color) => void;
  className?: string;
};

export const ColorPicker = ({ value: valueFromProps, onChange, className }: ColorPickerProps) => {
  const hsvaValue = useMemo(
    () =>
      hslaToHsva({
        h: valueFromProps.hue * 360,
        l: valueFromProps.lightness * 100,
        s: valueFromProps.saturation * 100,
        a: valueFromProps.alpha,
      }),
    [valueFromProps],
  );

  return (
    <Colorful
      className={clsx("ColorPicker", className)}
      color={hsvaValue}
      onChange={(color) => {
        onChange(fromHsl(color.hsla.h, color.hsla.s, color.hsla.l, color.hsla.a));
      }}
    />
  );
};
