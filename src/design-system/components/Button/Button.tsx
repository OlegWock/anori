import { Icon } from "@anori/design-system/components/Icon/Icon";
import { type ButtonHTMLAttributes, forwardRef, type ReactNode } from "react";
import { css, cva, cx } from "styled-system/css";

export type ButtonSize = "normal" | "compact";
export type ButtonVariant = "primary" | "secondary" | "frosted" | "ghost";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  block?: boolean;
  visuallyDisabled?: boolean;
  loading?: boolean;
  children?: ReactNode;
  // Icon *name* (not an element) rendered before/after the label. The Button owns the icon's size,
  // color and spacing so it can't be misaligned or recoloured — the blessed way to put an icon in a
  // button. Passing `<Icon>` as a child still works but is the caller's responsibility to align.
  iconStart?: string;
  iconEnd?: string;
}

export const button = cva({
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
    // Trim the label's box to cap-height/alphabetic so it matches the cap-height icons → precise
    // icon↔text alignment. Progressive enhancement: ignored where text-box isn't supported.
    textBox: "trim-both cap alphabetic",
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
        boxShadow: "inset 0 0 0 2px {colors.frosted.strong}",
        "&:hover:not(:disabled):not([aria-disabled=true])": { bg: "frosted" },
      },
      // Like frosted but with no edge — a quiet, borderless button (e.g. a modal close).
      ghost: {
        bg: "transparent",
        color: "text.primary",
        "&:hover:not(:disabled):not([aria-disabled=true])": { bg: "frosted" },
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
const buttonIcon = css({ flexShrink: 0 });

// The inner content of a button-styled control (the loading spinner + label/icons). Shared so
// link-flavoured buttons (LinkButton/LinkIconButton) render identically to <button> ones.
export const ButtonContent = ({
  loading,
  iconStart,
  iconEnd,
  children,
}: {
  loading?: boolean;
  iconStart?: string;
  iconEnd?: string;
  children?: ReactNode;
}) => (
  <>
    {loading && <span className={spinner} />}
    <span className={cx(content, loading && contentHidden)}>
      {iconStart && <Icon icon={iconStart} height="1em" className={buttonIcon} aria-hidden />}
      {children}
      {iconEnd && <Icon icon={iconEnd} height="1em" className={buttonIcon} aria-hidden />}
    </span>
  </>
);

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
    iconStart,
    iconEnd,
    // Default to "button" (never an accidental form submit), but allow opting into "submit"/"reset".
    type = "button",
    ...props
  },
  ref,
) {
  const isDisabled = disabled || loading;
  return (
    <button
      type={type}
      {...props}
      ref={ref}
      disabled={visuallyDisabled ? undefined : isDisabled}
      aria-disabled={visuallyDisabled ? "true" : undefined}
      onClick={visuallyDisabled || loading ? undefined : onClick}
      className={cx(button({ variant, size, block, loading }), className)}
    >
      <ButtonContent loading={loading} iconStart={iconStart} iconEnd={iconEnd}>
        {children}
      </ButtonContent>
    </button>
  );
});
