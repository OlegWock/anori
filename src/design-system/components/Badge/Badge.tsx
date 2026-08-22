import { Icon } from "@anori/design-system/components/Icon/Icon";
import type { ReactNode } from "react";
import { css, cva, cx } from "styled-system/css";

const badge = cva({
  base: {
    display: "inline-flex",
    alignItems: "center",
    gap: "1-5",
    width: "fit-content",
    paddingInline: "3",
    paddingBlock: "1",
    borderRadius: "full",
    fontSize: "xs",
    fontWeight: "medium",
    lineHeight: "none",
    whiteSpace: "nowrap",
  },
  variants: {
    variant: {
      neutral: { bg: "control", boxShadow: "control.edge", color: "text.primary" },
      accent: { bg: "accent", boxShadow: "accent.edge", color: "on-accent" },
    },
  },
  defaultVariants: {
    variant: "neutral",
  },
});
const badgeIcon = css({ flexShrink: 0 });

export type BadgeProps = {
  icon?: string;
  variant?: "neutral" | "accent";
  children?: ReactNode;
  className?: string;
};

export const Badge = ({ icon, variant, children, className }: BadgeProps) => {
  return (
    <span className={cx(badge({ variant }), className)}>
      {icon && <Icon icon={icon} height="1.1em" className={badgeIcon} aria-hidden />}
      {children}
    </span>
  );
};
