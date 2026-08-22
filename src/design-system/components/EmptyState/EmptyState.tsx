import { builtinIcons } from "@anori/design-system/components/Icon/builtin-icons";
import { Icon } from "@anori/design-system/components/Icon/Icon";
import { ScrollArea } from "@anori/design-system/components/ScrollArea/ScrollArea";
import type { ReactNode } from "react";
import { css, cva, cx } from "styled-system/css";

const emptyState = css({
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  alignItems: "center",
  gap: "3",
  paddingBlock: "6",
  paddingInline: "6",
  textAlign: "center",
  color: "text.placeholder",
  minHeight: "100%",
});
const emptyIcon = css({ color: "icon.subtle", display: "flex" });
const emptyTitle = cva({
  base: { fontSize: "base", fontWeight: "regular", color: "text.primary", margin: 0, maxWidth: "25rem" },
  variants: {
    muted: { true: { color: "text.placeholder" } },
    compact: { true: { fontSize: "sm" } },
  },
});
const emptyDescription = css({ fontSize: "sm", maxWidth: "25rem", lineHeight: "normal", margin: 0 });

export type EmptyStateProps = {
  title: string;
  icon?: string;
  description?: string | ReactNode;
  muted?: boolean;
  compact?: boolean;
  children?: ReactNode;
  className?: string;
  contentClassName?: string;
};

export const EmptyState = ({
  icon,
  title,
  description,
  muted,
  compact,
  children,
  className,
  contentClassName,
}: EmptyStateProps) => {
  const iconSize = compact ? 28 : 40;
  return (
    <ScrollArea className={className} contentClassName={cx(emptyState, contentClassName)}>
      <div className={emptyIcon}>
        <Icon icon={icon ?? builtinIcons.empty} width={iconSize} height={iconSize} />
      </div>
      <h3 className={emptyTitle({ muted, compact })}>{title}</h3>
      {description && <p className={emptyDescription}>{description}</p>}
      {children}
    </ScrollArea>
  );
};
