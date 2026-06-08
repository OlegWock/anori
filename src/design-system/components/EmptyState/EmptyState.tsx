import { builtinIcons } from "@anori/design-system/components/Icon/builtin-icons";
import { Icon } from "@anori/design-system/components/Icon/Icon";
import type { ReactNode } from "react";
import { css } from "styled-system/css";

const emptyState = css({
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  alignItems: "center",
  gap: "4",
  paddingBlock: "12",
  paddingInline: "6",
  textAlign: "center",
  color: "text.placeholder",
});
const emptyIcon = css({ opacity: 0.6 });
const emptyTitle = css({ fontSize: "lg", fontWeight: "regular", color: "text.primary", margin: 0 });
const emptyDescription = css({ fontSize: "sm", maxWidth: "400px", lineHeight: "normal", margin: 0 });

export type EmptyStateProps = {
  title: string;
  icon?: string;
  description?: string | ReactNode;
  children?: ReactNode;
};

export const EmptyState = ({ icon, title, description, children }: EmptyStateProps) => {
  return (
    <div className={emptyState}>
      <div className={emptyIcon}>
        <Icon icon={icon ?? builtinIcons.empty} width={48} height={48} />
      </div>
      <h3 className={emptyTitle}>{title}</h3>
      {description && <p className={emptyDescription}>{description}</p>}
      {children}
    </div>
  );
};
