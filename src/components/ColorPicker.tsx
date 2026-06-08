import { fromHsl, type HslColor, parseColor, toHexWithAlpha } from "@anori/utils/color";
import "./ColorPicker.scss";
import { Input } from "@anori/design-system/components/Input/Input";
import { Colorful, hslaToHsva } from "@uiw/react-color";
import clsx from "clsx";
import { useId, useMemo, useState } from "react";

export type ColorPickerProps = {
  value: HslColor;
  onChange: (val: HslColor) => void;
  label?: string;
  className?: string;
};

export const ColorPicker = ({ value: valueFromProps, onChange, label, className }: ColorPickerProps) => {
  const inputId = useId();
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

  const [textValue, setTextValue] = useState(() => toHexWithAlpha(valueFromProps));
  const [textInvalid, setTextInvalid] = useState(false);

  // Keep the text input in sync when the color is changed elsewhere (e.g. via the picker).
  const [syncedValue, setSyncedValue] = useState(valueFromProps);
  if (valueFromProps !== syncedValue) {
    setSyncedValue(valueFromProps);
    setTextValue(toHexWithAlpha(valueFromProps));
    setTextInvalid(false);
  }

  const handleTextChange = (val: string) => {
    setTextValue(val);
    const parsed = parseColor(val);
    if (parsed) {
      setTextInvalid(false);
      onChange(parsed);
    } else {
      setTextInvalid(true);
    }
  };

  return (
    <div className={clsx("ColorPicker", className)}>
      <Colorful
        className="ColorPicker-picker"
        color={hsvaValue}
        onChange={(color) => {
          onChange(fromHsl(color.hsla.h, color.hsla.s, color.hsla.l, color.hsla.a));
        }}
      />
      <div className="ColorPicker-field">
        {!!label && (
          <label className="ColorPicker-label" htmlFor={inputId}>
            {label}
          </label>
        )}
        <Input
          id={inputId}
          className={clsx("ColorPicker-input", { "ColorPicker-input--invalid": textInvalid })}
          value={textValue}
          spellCheck={false}
          onValueChange={handleTextChange}
          onBlur={() => {
            // Snap back to the actual color if the user left an unparseable value
            setTextValue(toHexWithAlpha(valueFromProps));
            setTextInvalid(false);
          }}
        />
      </div>
    </div>
  );
};
