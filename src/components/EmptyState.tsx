import { Icon } from "@anori/components/icon/Icon";
import type { ReactNode } from "react";
import "./EmptyState.scss";
import { builtinIcons } from "@anori/components/icon/builtin-icons";

export type EmptyStateProps = {
  title: string;
  icon?: string;
  description?: string | ReactNode;
  children?: ReactNode;
};

export const EmptyState = ({ icon, title, description, children }: EmptyStateProps) => {
  return (
    <div className="EmptyState">
      <div className="empty-icon">
        <Icon icon={icon ?? builtinIcons.empty} width={48} height={48} />
      </div>
      <h3 className="empty-title">{title}</h3>
      {description && <p className="empty-description">{description}</p>}
      {children}
    </div>
  );
};
