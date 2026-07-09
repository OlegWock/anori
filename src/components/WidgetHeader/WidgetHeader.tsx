import { Heading } from "@anori/design-system/components/Heading/Heading";
import type { ReactNode } from "react";
import { css, cx } from "styled-system/css";

const header = css({
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) auto",
  gridTemplateRows: "2rem",
  alignItems: "center",
  columnGap: "2",
  rowGap: "0-5",
  marginBottom: "1",
  flexShrink: "0",
});
const titleCell = css({
  gridColumn: "1",
  gridRow: "1",
  display: "flex",
  alignItems: "center",
  minWidth: 0,
});
const actionCell = css({ gridColumn: "2", gridRow: "1", display: "flex", alignItems: "center" });
const subtitleText = css({ gridColumn: "1", gridRow: "2", fontSize: "sm", color: "text.subtle" });

export type WidgetHeaderProps = {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  className?: string;
};

export const WidgetHeader = ({ title, subtitle, action, className }: WidgetHeaderProps) => (
  <div className={cx(header, className)}>
    <div className={titleCell}>
      <Heading>{title}</Heading>
    </div>
    {action != null && <div className={actionCell}>{action}</div>}
    {subtitle != null && <div className={subtitleText}>{subtitle}</div>}
  </div>
);
