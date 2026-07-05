import { IconPicker } from "@anori/components/IconPicker/IconPicker";
import { Button } from "@anori/design-system/components/Button/Button";
import { builtinIcons } from "@anori/design-system/components/Icon/builtin-icons";
import { Icon } from "@anori/design-system/components/Icon/Icon";
import { IconButton } from "@anori/design-system/components/IconButton/IconButton";
import { Input } from "@anori/design-system/components/Input/Input";
import { Popover } from "@anori/design-system/components/Popover/Popover";
import { IS_TOUCH_DEVICE } from "@anori/utils/device";
import { ReorderItem } from "@anori/utils/motion/reorder";
import type { Folder } from "@anori/utils/user-data/types";
import { useDragControls } from "motion/react";
import { useRef } from "react";
import { useTranslation } from "react-i18next";
import { css } from "styled-system/css";
import { token } from "styled-system/tokens";

const row = css({
  display: "flex",
  alignItems: "center",
  gap: "3",
  paddingBlock: "2",
  paddingInline: "3",
  borderRadius: "md",
  bg: "surface.elevated",
  boxShadow: "surface.elevated.edge",
});
const handle = css({ cursor: "grab!", touchAction: "none", flexShrink: 0 });
const iconButton = css({ px: 0, aspectRatio: "1", justifyContent: "center", flexShrink: 0 });
const staticIcon = css({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: "2.25rem",
  height: "2.25rem",
  flexShrink: 0,
});
const nameInput = css({ flex: 1, minWidth: "0!", marginLeft: "-2" });
const nameText = css({
  flex: 1,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  paddingInline: "2",
});
const slot = css({ width: "2.25rem", flexShrink: 0 });
const deleteIcon = css({ "& svg": { height: "1.2em!" } });

export const FOLDER_NAME_INPUT_ATTR = "data-folder-name-input";

export const FolderItem = ({
  folder,
  editable = false,
  onRemove,
  onNameChange,
  onIconChange,
}: {
  folder: Folder;
  editable?: boolean;
  onNameChange?: (newName: string) => void;
  onIconChange?: (newIcon: string) => void;
  onRemove?: () => void;
}) => {
  const { t } = useTranslation();
  const controls = useDragControls();
  const iconSearchRef = useRef<HTMLInputElement>(null);

  if (!editable) {
    return (
      <div className={row}>
        <div className={slot} />
        <div className={staticIcon}>
          <Icon icon={folder.icon} size="md" />
        </div>
        <span className={nameText}>{folder.name}</span>
        <div className={slot} />
      </div>
    );
  }

  return (
    <ReorderItem
      value={folder}
      dragListener={false}
      dragControls={controls}
      as="div"
      className={row}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1, transition: { duration: 0.12 } }}
      exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.12 } }}
    >
      <IconButton
        variant="ghost"
        icon={builtinIcons.dragHandle}
        label={t("settings.folders.reorder")}
        showTooltip={false}
        className={handle}
        onPointerDown={(e) => {
          e.preventDefault();
          controls.start(e);
        }}
      />
      <Popover
        component={IconPicker}
        initialFocus={IS_TOUCH_DEVICE ? -1 : iconSearchRef}
        additionalData={{
          onSelected: (icon: string) => onIconChange?.(icon),
          inputRef: iconSearchRef,
          iconColor: token("colors.icon.strong"),
        }}
      >
        <Button variant="frosted" className={iconButton} aria-label={t("settings.folders.changeIcon")}>
          <Icon icon={folder.icon} size="md" color="icon.strong" />
        </Button>
      </Popover>
      <Input
        variant="ghost"
        className={nameInput}
        value={folder.name}
        onValueChange={(name) => onNameChange?.(name)}
        {...{ [FOLDER_NAME_INPUT_ATTR]: folder.id }}
      />
      <IconButton
        variant="ghost"
        className={deleteIcon}
        icon={builtinIcons.trash}
        label={t("settings.folders.removeFolder")}
        onClick={() => onRemove?.()}
      />
    </ReorderItem>
  );
};
