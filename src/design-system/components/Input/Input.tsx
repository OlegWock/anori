import { clsx } from "clsx";
import { type ChangeEvent, type ComponentProps, forwardRef } from "react";
import TextareaAutosize, { type TextareaAutosizeProps } from "react-textarea-autosize";
import { css } from "styled-system/css";

// Filled text field on the `control` surface (no resting border; accent outline on focus). `lineHeight`
// is applied per element (one atom each) rather than in the base + an !important override.
const inputBase = css({
  minWidth: "15rem",
  borderRadius: "md",
  border: "none",
  px: "4",
  py: "3",
  fontFamily: "inherit",
  fontSize: "sm",
  letterSpacing: "inherit",
  color: "text.primary",
  bg: "control",
  "&::placeholder": { color: "text.placeholder" },
  _focus: {
    outlineWidth: "2px",
    outlineStyle: "solid",
    outlineColor: "accent",
  },
});
const inputLineHeight = css({ lineHeight: "none" });
const textareaLineHeight = css({ lineHeight: "inherit" });

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
        className={clsx(inputBase, inputLineHeight, "Input", className)}
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
      className={clsx(inputBase, textareaLineHeight, "Input", "TextArea", className)}
      {...props}
    />
  );
});
