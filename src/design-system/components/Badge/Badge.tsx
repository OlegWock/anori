import { Icon } from "@anori/design-system/components/Icon/Icon";
import type { ReactNode } from "react";
import { css, cx } from "styled-system/css";

const badge = css({
  bg: "control",
  display: "inline-flex",
  alignItems: "center",
  gap: "1-5",
  width: "fit-content",
  paddingInline: "3",
  paddingBlock: "1",
  borderRadius: "full",
  boxShadow: "control.edge",
  fontSize: "xs",
  fontWeight: "medium",
  lineHeight: "none",
  whiteSpace: "nowrap",
  color: "text.primary",
});
const badgeIcon = css({ flexShrink: 0 });

export type BadgeProps = {
  icon?: string;
  children?: ReactNode;
  className?: string;
};

export const Badge = ({ icon, children, className }: BadgeProps) => {
  return (
    <span className={cx(badge, className)}>
      {icon && <Icon icon={icon} height="1.1em" className={badgeIcon} aria-hidden />}
      {children}
    </span>
  );
};
