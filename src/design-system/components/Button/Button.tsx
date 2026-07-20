import { Icon } from "@anori/design-system/components/Icon/Icon";
import type { ButtonHTMLAttributes, ReactNode, Ref } from "react";
import { css, cva, cx } from "styled-system/css";

export type ButtonSize = "normal" | "medium" | "compact";
export type ButtonVariant = "primary" | "secondary" | "frosted" | "ghost";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  block?: boolean;
  visuallyDisabled?: boolean;
  loading?: boolean;
  children?: ReactNode;
  // Icon *name* (not an element); the Button owns its size/colour/spacing.
  iconStart?: string;
  iconEnd?: string;
  ref?: Ref<HTMLButtonElement>;
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
    textBox: "trim-both cap alphabetic",
    transition: "background 0.15s ease-in-out, color 0.15s ease-in-out, box-shadow 0.15s ease-in-out",
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
      frosted: {
        bg: "transparent",
        color: "text.primary",
        boxShadow: "inset 0 0 0 2px {colors.frosted.strong}",
        "&:hover:not(:disabled):not([aria-disabled=true])": { bg: "ghost.hover" },
      },
      ghost: {
        bg: "transparent",
        color: "text.primary",
        "&:hover:not(:disabled):not([aria-disabled=true])": { bg: "ghost.hover" },
      },
    },
    size: {
      normal: { height: "2.25rem", px: "5", fontSize: "base" },
      medium: { height: "2rem", px: "4", fontSize: "sm" },
      compact: { height: "1.75rem", px: "4", fontSize: "sm" },
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

export const Button = ({
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
  // Default to "button" to avoid accidental form submits (default vanilla `button` type)
  type = "button",
  ref,
  ...props
}: ButtonProps) => {
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
};
