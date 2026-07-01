import { Icon } from "@anori/design-system/components/Icon/Icon";
import type { ReactNode } from "react";
import { css, cva, cx } from "styled-system/css";

export type BadgeBackground = "surface" | "modal";

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
    color: "text.primary",
  },
  variants: {
    background: {
      surface: { bg: "surface.elevated" },
      modal: { bg: "surface" },
    },
  },
  defaultVariants: { background: "surface" },
});
const badgeIcon = css({ flexShrink: 0 });

export type BadgeProps = {
  background?: BadgeBackground;
  icon?: string;
  children?: ReactNode;
  className?: string;
};

export const Badge = ({ background, icon, children, className }: BadgeProps) => {
  return (
    <span className={cx(badge({ background }), className)}>
      {icon && <Icon icon={icon} height="1.1em" className={badgeIcon} aria-hidden />}
      {children}
    </span>
  );
};
