import { type ButtonHTMLAttributes, forwardRef, type ReactNode } from "react";
import { css, cva, cx } from "styled-system/css";

type ButtonSize = "normal" | "compact";
type ButtonVariant = "primary" | "secondary" | "frosted";

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  block?: boolean;
  visuallyDisabled?: boolean;
  loading?: boolean;
  children?: ReactNode;
}

const button = cva({
  base: {
    position: "relative",
    display: "inline-flex",
    justifyContent: "center",
    alignItems: "center",
    gap: "1-5",
    cursor: "pointer",
    fontFamily: "inherit",
    fontWeight: "medium",
    whiteSpace: "nowrap",
    userSelect: "none",
    borderRadius: "xl",
    transition: "background 0.15s ease-in-out, color 0.15s ease-in-out, box-shadow 0.15s ease-in-out",
    // Disabled/loading: common bits; each variant supplies a muted fill from its own palette below.
    "&:disabled, &[aria-disabled=true]": {
      color: "text.subtle",
      cursor: "not-allowed",
      boxShadow: "none",
    },
  },
  variants: {
    variant: {
      primary: {
        bg: "accent",
        color: "on-accent",
        boxShadow: "accent.edge",
        "&:hover:not(:disabled):not([aria-disabled=true])": { bg: "accent.hover" },
        "&:disabled, &[aria-disabled=true]": { bg: "accent.disabled", color: "on-accent.disabled" },
      },
      secondary: {
        bg: "control",
        color: "text.primary",
        boxShadow: "control.edge",
        "&:hover:not(:disabled):not([aria-disabled=true])": { bg: "control.hover" },
        "&:disabled, &[aria-disabled=true]": { bg: "control.disabled" },
      },
      // Matches the legacy button: transparent, with a faint text-colored inset edge + hover fill —
      // meant to sit on the frosted plate (so it uses text.primary per DS-1). Disabled drops the edge
      // (base) and just dims the text.
      frosted: {
        bg: "transparent",
        color: "text.primary",
        boxShadow: "inset 0 0 0 2px color-mix(in srgb, var(--ds-text-primary) 18%, transparent)",
        "&:hover:not(:disabled):not([aria-disabled=true])": {
          bg: "color-mix(in srgb, var(--ds-text-primary) 10%, transparent)",
        },
      },
    },
    // Fixed heights (no vertical padding) — the design-system control sizes.
    size: {
      normal: { height: "36px", px: "5", fontSize: "base" },
      compact: { height: "28px", px: "4", fontSize: "sm" },
    },
    block: { true: { width: "100%" } },
    loading: { true: { cursor: "wait" } },
  },
  defaultVariants: { variant: "primary", size: "normal" },
});

const spinner = css({
  position: "absolute",
  width: "1em",
  height: "1em",
  borderWidth: "2px",
  borderStyle: "solid",
  borderColor: "color-mix(in srgb, currentColor 30%, transparent)",
  borderTopColor: "currentColor",
  borderRadius: "full",
  animation: "spin 0.6s linear infinite",
});

const content = css({ display: "contents" });
const contentHidden = css({ visibility: "hidden" });

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = "primary",
    size = "normal",
    block = false,
    visuallyDisabled = false,
    loading = false,
    disabled,
    onClick,
    className,
    children,
    ...props
  },
  ref,
) {
  const isDisabled = disabled || loading;
  return (
    <button
      type="button"
      {...props}
      ref={ref}
      disabled={visuallyDisabled ? undefined : isDisabled}
      aria-disabled={visuallyDisabled ? "true" : undefined}
      onClick={visuallyDisabled || loading ? undefined : onClick}
      className={cx(button({ variant, size, block, loading }), className)}
    >
      {loading && <span className={spinner} />}
      <span className={cx(content, loading && contentHidden)}>{children}</span>
    </button>
  );
});
