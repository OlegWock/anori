import * as RadixSlider from "@radix-ui/react-slider";
import { useMemo } from "react";
import { css, cx } from "styled-system/css";

const root = css({
  position: "relative",
  display: "flex",
  alignItems: "center",
  userSelect: "none",
  touchAction: "none",
  height: "20px",
});
const track = css({ position: "relative", flexGrow: 1, height: "3px", borderRadius: "full", bg: "surface.elevated" });
const range = css({ position: "absolute", height: "100%", borderRadius: "full", bg: "frosted.strong" });
const thumb = css({
  display: "block",
  width: "20px",
  height: "20px",
  borderRadius: "full",
  bg: "surface.elevated",
  boxShadow: "surface.elevated.edge",
  outline: "2px solid transparent",
  transition: "outline-color 0.15s ease",
  _hover: { outlineColor: "frosted" },
  _focus: { outlineColor: "transparent" },
});

type SliderProps = {
  className?: string;
  value: number;
  onChange?: (val: number) => void;
  onCommit?: (val: number) => void;
  max?: number;
  min?: number;
  step?: number;
  disabled?: boolean;
};

export const Slider = ({ className, value, onChange, onCommit, ...props }: SliderProps) => {
  const val = useMemo(() => [value], [value]);
  return (
    <RadixSlider.Root
      className={cx(root, "Slider", className)}
      value={val}
      onValueChange={(val) => onChange?.(val[0])}
      onValueCommit={(val) => onCommit?.(val[0])}
      {...props}
    >
      <RadixSlider.Track className={cx(track, "SliderTrack")}>
        <RadixSlider.Range className={cx(range, "SliderRange")} />
      </RadixSlider.Track>
      <RadixSlider.Thumb className={cx(thumb, "SliderThumb")} />
    </RadixSlider.Root>
  );
};
