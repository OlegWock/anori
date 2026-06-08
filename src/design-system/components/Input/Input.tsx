import { clsx } from "clsx";
import { type ChangeEvent, type ComponentProps, forwardRef } from "react";
import TextareaAutosize, { type TextareaAutosizeProps } from "react-textarea-autosize";
import { css } from "styled-system/css";

// Filled text field on the `control` surface (no resting border; accent outline on focus). Sizing is
// applied per element: a single-line Input gets a fixed height matching the Button (36px), while the
// Textarea autosizes so it keeps vertical padding instead.
const inputBase = css({
  minWidth: "15rem",
  borderRadius: "md",
  border: "none",
  px: "4",
  fontFamily: "inherit",
  fontSize: "sm",
  letterSpacing: "inherit",
  color: "text.primary",
  bg: "control",
  // Edge (DS-3): an inset ring for volume instead of a delineating border.
  boxShadow: "control.edge",
  "&::placeholder": { color: "text.placeholder" },
  _focus: {
    outlineWidth: "2px",
    outlineStyle: "solid",
    outlineColor: "accent",
  },
});
// flexShrink: 0 — as a flex item in a height-constrained column the fixed height would otherwise be
// squished below 36px.
const inputControl = css({ height: "36px", lineHeight: "none", flexShrink: 0 });
const textareaControl = css({ py: "3", lineHeight: "inherit" });

export const Input = forwardRef<HTMLInputElement, ComponentProps<"input"> & { onValueChange?: (val: string) => void }>(
  ({ className, onValueChange, onChange, ...props }, ref) => {
    const patchedOnChange = (e: ChangeEvent<HTMLInputElement>) => {
      if (onValueChange) onValueChange(e.target.value);
      if (onChange) return onChange(e);
    };

    return (
      <input
        onChange={patchedOnChange}
        ref={ref}
        className={clsx(inputBase, inputControl, "Input", className)}
        {...props}
      />
    );
  },
);

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaAutosizeProps & { onValueChange?: (val: string) => void }
>(({ className, onValueChange, onChange, ...props }, ref) => {
  const patchedOnChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    if (onValueChange) onValueChange(e.target.value);
    if (onChange) return onChange(e);
  };

  return (
    <TextareaAutosize
      onChange={patchedOnChange}
      ref={ref}
      className={clsx(inputBase, textareaControl, "Input", "TextArea", className)}
      {...props}
    />
  );
});
