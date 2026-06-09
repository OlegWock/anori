import { clsx } from "clsx";
import { type ChangeEvent, type ComponentProps, forwardRef } from "react";
import TextareaAutosize, { type TextareaAutosizeProps } from "react-textarea-autosize";
import { css, cva } from "styled-system/css";

export type InputVariant = "filled" | "ghost";

// Filled (default): the `control` surface with an inset edge. Ghost: transparent until focus, so it
// blends into whatever it sits on (e.g. a list-row name field). Both take the accent focus outline.
const input = cva({
  base: {
    minWidth: "15rem",
    borderRadius: "md",
    border: "none",
    px: "4",
    fontFamily: "inherit",
    fontSize: "sm",
    letterSpacing: "inherit",
    color: "text.primary",
    "&::placeholder": { color: "text.placeholder" },
    // Inset the focus ring (negative offset) so it's drawn inside the input's own box rather than
    // outside it — otherwise an edge-to-edge input in an overflow:hidden container clips the outline.
    _focus: {
      outlineWidth: "2px",
      outlineStyle: "solid",
      outlineColor: "accent",
      outlineOffset: "-2px",
    },
  },
  variants: {
    variant: {
      filled: { bg: "control", boxShadow: "control.edge" },
      // Transparent at rest; a faint fill on hover hints it's an editable field.
      ghost: {
        bg: "transparent",
        transition: "background-color 0.15s ease",
        _hover: { bg: "frosted" },
        _focus: { bg: "frosted" },
      },
    },
  },
  defaultVariants: { variant: "filled" },
});
// flexShrink: 0 — as a flex item in a height-constrained column the fixed height would otherwise be
// squished below 36px.
const inputControl = css({ height: "36px", lineHeight: "none", flexShrink: 0 });
const textareaControl = css({ py: "3", lineHeight: "inherit" });

export const Input = forwardRef<
  HTMLInputElement,
  ComponentProps<"input"> & { onValueChange?: (val: string) => void; variant?: InputVariant }
>(({ className, onValueChange, onChange, variant, ...props }, ref) => {
  const patchedOnChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (onValueChange) onValueChange(e.target.value);
    if (onChange) return onChange(e);
  };

  return (
    <input
      onChange={patchedOnChange}
      ref={ref}
      className={clsx(input({ variant }), inputControl, "Input", className)}
      {...props}
    />
  );
});

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaAutosizeProps & { onValueChange?: (val: string) => void; variant?: InputVariant }
>(({ className, onValueChange, onChange, variant, ...props }, ref) => {
  const patchedOnChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    if (onValueChange) onValueChange(e.target.value);
    if (onChange) return onChange(e);
  };

  return (
    <TextareaAutosize
      onChange={patchedOnChange}
      ref={ref}
      className={clsx(input({ variant }), textareaControl, "Input", "TextArea", className)}
      {...props}
    />
  );
});
