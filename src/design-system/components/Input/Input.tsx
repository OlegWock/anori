import { clsx } from "clsx";
import { type ChangeEvent, type ComponentProps, type CSSProperties, forwardRef, useState } from "react";
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
    fontSize: "md",
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

// Plain (non-autosizing) textarea: a fixed box that scrolls. Used when the field should fill a
// height-constrained parent (`autosize={false}`) rather than grow with its content.
const textareaPlain = css({
  py: "3",
  lineHeight: "inherit",
  resize: "none",
  overflowY: "auto",
  minHeight: 0,
  "&::-webkit-scrollbar": { width: "7px", height: "7px" },
  "&::-webkit-scrollbar-thumb": { borderRadius: "md", border: "2px solid var(--ds-card)", backgroundColor: "card" },
  "&::-webkit-scrollbar-track": { backgroundColor: "surface.elevated", borderRadius: "md" },
  scrollbarWidth: "thin",
  scrollbarColor: "var(--ds-card) transparent",
});

// Autosizing textarea via the CSS "replicated content" grid trick: the wrapper is a single grid cell
// shared by the <textarea> and a hidden ::after mirror that holds a copy of the value. The mirror
// sizes the cell to the content, so the textarea grows with it — no JS measuring (and no dependency).
// The value is mirrored onto data-replicated-value; --max-rows caps the height (then the textarea
// scrolls). Box styling lives here (not on the textarea) so the textarea and mirror wrap identically.
const textareaWrapper = cva({
  base: {
    display: "grid",
    minWidth: 0,
    borderRadius: "md",
    px: "4",
    py: "3",
    fontFamily: "inherit",
    fontSize: "md",
    lineHeight: "inherit",
    letterSpacing: "inherit",
    color: "text.primary",
    cursor: "text",
    "&:focus-within": {
      outlineWidth: "2px",
      outlineStyle: "solid",
      outlineColor: "accent",
      outlineOffset: "-2px",
    },
    "& > textarea, &::after": {
      gridArea: "1 / 1 / 2 / 2",
      font: "inherit",
      letterSpacing: "inherit",
      whiteSpace: "pre-wrap",
      overflowWrap: "break-word",
      maxHeight: "calc(var(--max-rows, 9999) * 1lh)",
    },
    "&::after": {
      content: 'attr(data-replicated-value) " "',
      visibility: "hidden",
    },
    "& > textarea": {
      width: "100%",
      appearance: "none",
      border: "none",
      background: "transparent",
      padding: 0,
      margin: 0,
      resize: "none",
      outline: "none",
      overflowY: "auto",
      color: "inherit",
      "&::placeholder": { color: "text.placeholder" },
      "&::-webkit-scrollbar": { width: "7px", height: "7px" },
      "&::-webkit-scrollbar-thumb": { borderRadius: "md", border: "2px solid var(--ds-card)", backgroundColor: "card" },
      "&::-webkit-scrollbar-track": { backgroundColor: "surface.elevated", borderRadius: "md" },
      scrollbarWidth: "thin",
      scrollbarColor: "var(--ds-card) transparent",
    },
  },
  variants: {
    variant: {
      filled: { bg: "control", boxShadow: "control.edge" },
      ghost: {
        bg: "transparent",
        transition: "background-color 0.15s ease",
        _hover: { bg: "frosted" },
        "&:focus-within": { bg: "frosted" },
      },
    },
  },
  defaultVariants: { variant: "filled" },
});

export type TextareaProps = ComponentProps<"textarea"> & {
  onValueChange?: (val: string) => void;
  variant?: InputVariant;
  // Cap the autosized height to this many lines; beyond it the textarea scrolls. Ignored when autosize is off.
  maxRows?: number;
  minRows?: number;
  // Grow with content (default). Set false to fill a height-constrained parent and scroll instead.
  autosize?: boolean;
};

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      className,
      onValueChange,
      onChange,
      variant,
      value,
      defaultValue,
      maxRows,
      minRows = 1,
      autosize = true,
      style,
      ...props
    },
    ref,
  ) => {
    const [internalValue, setInternalValue] = useState(() => String(defaultValue ?? ""));
    // The mirror needs the current text: read it from the controlled value, or track it locally when uncontrolled.
    const replicatedValue = value !== undefined ? String(value) : internalValue;

    const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
      if (value === undefined) setInternalValue(e.target.value);
      if (onValueChange) onValueChange(e.target.value);
      if (onChange) onChange(e);
    };

    if (!autosize) {
      return (
        <textarea
          ref={ref}
          className={clsx(input({ variant }), textareaPlain, "Input", "TextArea", className)}
          value={value}
          defaultValue={defaultValue}
          onChange={handleChange}
          style={style}
          {...props}
        />
      );
    }

    return (
      // biome-ignore lint/a11y/noStaticElementInteractions: forwards clicks on its padding to the textarea it wraps
      <div
        className={clsx(textareaWrapper({ variant }), className)}
        data-replicated-value={replicatedValue}
        style={{ ...style, "--max-rows": maxRows } as CSSProperties}
        onMouseDown={(e) => {
          // Clicking the wrapper's padding (outside the textarea) should still focus the field.
          if (e.target === e.currentTarget) {
            e.preventDefault();
            e.currentTarget.querySelector("textarea")?.focus();
          }
        }}
      >
        <textarea
          ref={ref}
          className={clsx("Input", "TextArea")}
          value={value}
          defaultValue={defaultValue}
          rows={minRows}
          onChange={handleChange}
          {...props}
        />
      </div>
    );
  },
);
