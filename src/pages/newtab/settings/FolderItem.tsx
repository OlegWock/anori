import { Button } from "@anori/components/Button";
import { Icon } from "@anori/components/Icon";
import { IconPicker } from "@anori/components/IconPicker";
import { Popover } from "@anori/components/Popover";
import type { Folder } from "@anori/utils/user-data/types";
import { m, useDragControls } from "framer-motion";
import { useRef } from "react";
import "./FolderItem.scss";
import { ReorderItem } from "@anori/components/lazy-components";
import { builtinIcons } from "@anori/utils/builtin-icons";
import { IS_TOUCH_DEVICE } from "@anori/utils/device";

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
  const controls = useDragControls();
  const iconSearchRef = useRef<HTMLInputElement>(null);

  const ICON_SIZE = 22;

  if (editable) {
    return (
      <ReorderItem value={folder} dragListener={false} dragControls={controls} as="div" className="FolderItem">
        <Icon
          className="folder-drag-indicator"
          icon={builtinIcons.dragHandle}
          width={ICON_SIZE}
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
          }}
        >
          <Button className="folder-icon">
            <Icon icon={folder.icon} width={ICON_SIZE} />
          </Button>
        </Popover>
        <input
          value={folder.name}
          onChange={(e) => onNameChange?.(e.target.value)}
          className="folder-name"
          type="text"
        />
        <Button onClick={() => onRemove?.()}>
          <Icon icon={builtinIcons.close} height={ICON_SIZE} />
        </Button>
      </ReorderItem>
    );
  }

  return (
    <m.div className="FolderItem">
      <span style={{ width: ICON_SIZE }} />
      <button className="folder-icon static" type="button">
        <Icon icon={folder.icon} width={ICON_SIZE} />
      </button>
      <span className="folder-name">{folder.name}</span>
    </m.div>
  );
};
