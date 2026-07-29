import { SidebarButton, type SidebarButtonProps } from "@anori/components/SidebarButton/SidebarButton";
import { useWidgetDragActive } from "@anori/utils/dnd";
import type { Folder } from "@anori/utils/user-data/types";
import { useDroppable } from "@dnd-kit/react";
import type { Ref } from "react";
import { css, cx } from "styled-system/css";

export type FolderButtonProps = {
  folder: Folder;
} & Omit<SidebarButtonProps, "name" | "icon">;

const dropTarget = css({
  borderColor: "color-mix(in srgb, var(--ds-text-primary) 25%, transparent)!",
  zIndex: "docked!",
});
const highlight = css({ background: "color-mix(in srgb, var(--ds-text-primary) 25%, transparent)!" });

export const FolderButton = ({ folder, className, ...props }: FolderButtonProps) => {
  const widgetDragActive = useWidgetDragActive();
  const { ref: dropRef, isDropTarget } = useDroppable({
    id: folder.id,
    type: "folder",
    accept: "widget",
  });

  return (
    <SidebarButton
      ref={dropRef as Ref<HTMLButtonElement>}
      name={folder.name}
      icon={folder.icon}
      className={cx(widgetDragActive && dropTarget, isDropTarget && highlight, className)}
      {...props}
    />
  );
};
