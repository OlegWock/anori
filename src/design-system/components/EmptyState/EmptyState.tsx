import { builtinIcons } from "@anori/design-system/components/Icon/builtin-icons";
import { Icon } from "@anori/design-system/components/Icon/Icon";
import type { ReactNode } from "react";
import { css, cva, cx } from "styled-system/css";

const emptyState = css({
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  alignItems: "center",
  gap: "3",
  paddingBlock: "8",
  paddingInline: "6",
  textAlign: "center",
  color: "text.placeholder",
});
const emptyIcon = css({ color: "icon.subtle", display: "flex" });
const emptyTitle = cva({
  base: { fontSize: "base", fontWeight: "regular", color: "text.primary", margin: 0, maxWidth: "25rem" },
  variants: { muted: { true: { color: "text.placeholder" } } },
});
const emptyDescription = css({ fontSize: "sm", maxWidth: "25rem", lineHeight: "normal", margin: 0 });

export type EmptyStateProps = {
  title: string;
  icon?: string;
  description?: string | ReactNode;
  muted?: boolean;
  children?: ReactNode;
  className?: string;
};

export const EmptyState = ({ icon, title, description, muted, children, className }: EmptyStateProps) => {
  return (
    <div className={cx(emptyState, className)}>
      <div className={emptyIcon}>
        <Icon icon={icon ?? builtinIcons.empty} width={40} height={40} />
      </div>
      <h3 className={emptyTitle({ muted })}>{title}</h3>
      {description && <p className={emptyDescription}>{description}</p>}
      {children}
    </div>
  );
};
