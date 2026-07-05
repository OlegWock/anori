import { SidebarButton } from "@anori/components/SidebarButton/SidebarButton";
import { builtinIcons } from "@anori/design-system/components/Icon/builtin-icons";
import { ScrollArea } from "@anori/design-system/components/ScrollArea/ScrollArea";
import { TooltipProvider } from "@anori/design-system/components/Tooltip/Tooltip";
import { anoriSchema } from "@anori/utils/storage";
import { useStorageValue } from "@anori/utils/storage-lib";
import type { Folder } from "@anori/utils/user-data/types";
import { memo } from "react";
import { useTranslation } from "react-i18next";
import { css, cva } from "styled-system/css";

export type SidebarProps = {
  folders: Folder[];
  activeFolder: Folder;
  orientation: "vertical" | "horizontal";
  bookmarksBarVisible?: boolean;
  hasUnreadReleaseNotes?: boolean;
  cloudConnected?: boolean;
  cloudBehindSchema?: boolean;
  onFolderClick: (folder: Folder) => void;
  onToggleEditMode: () => void;
  onOpenWhatsNew: () => void;
  onOpenCloudAccount: () => void;
  onOpenSettings: () => void;
};

const sidebarWrapper = cva({
  base: { overflow: "hidden" },
  variants: {
    orientation: {
      vertical: { paddingBlock: "7", paddingInline: "2" },
      horizontal: { paddingBlock: "4", paddingInline: "6" },
    },
    autohide: { true: { "--sidebar-display": "none", "&:hover": { "--sidebar-display": "flex" } } },
    bookmarksBar: { true: {} },
  },
  compoundVariants: [
    { orientation: "vertical", autohide: true, css: { paddingInline: "4!", "&:hover": { paddingInline: "2!" } } },
    { orientation: "vertical", bookmarksBar: true, css: { paddingTop: "2!" } },
  ],
});

const sidebar = css({
  flexGrow: 0,
  flexShrink: 0,
  maxHeight: "100%",
  minHeight: "100%",
  display: "var(--sidebar-display, flex) !important",
});

const sidebarViewport = css({ flexGrow: 1, display: "flex", flexDirection: "column" });
const sidebarContentSlot = cva({
  base: { flexGrow: 1, height: "100%", minHeight: "100%", display: "flex" },
  variants: {
    orientation: {
      vertical: {},
      horizontal: { flexDirection: "column" },
    },
  },
});

const sidebarContent = cva({
  base: { display: "flex !important", gap: "8" },
  variants: {
    orientation: {
      vertical: { flexDirection: "column", paddingBlock: "3", paddingInline: "6" },
      horizontal: { flexDirection: "row", padding: "3" },
    },
  },
});

const spacer = css({ flexGrow: 1 });

export const Sidebar = memo(function Sidebar({
  folders,
  activeFolder,
  orientation,
  bookmarksBarVisible,
  hasUnreadReleaseNotes,
  cloudConnected,
  cloudBehindSchema,
  onFolderClick,
  onToggleEditMode,
  onOpenWhatsNew,
  onOpenCloudAccount,
  onOpenSettings,
}: SidebarProps) {
  const { t } = useTranslation();
  const [autoHideSidebar] = useStorageValue(anoriSchema.autoHideSidebar);

  return (
    <div
      className={sidebarWrapper({
        orientation,
        autohide: autoHideSidebar ?? false,
        bookmarksBar: bookmarksBarVisible ?? false,
      })}
    >
      <ScrollArea
        className={sidebar}
        viewportClassName={sidebarViewport}
        contentClassName={sidebarContentSlot({ orientation })}
        type="hover"
        direction={orientation}
        mirrorVerticalScrollToHorizontal
      >
        <div className={sidebarContent({ orientation })}>
          <TooltipProvider delay={50} closeDelay={50}>
            {folders.map((f) => {
              return (
                <SidebarButton
                  dropDestination={{ id: f.id }}
                  sidebarOrientation={orientation}
                  key={f.id}
                  icon={f.icon}
                  name={f.name}
                  active={activeFolder === f}
                  onClick={() => {
                    onFolderClick(f);
                  }}
                />
              );
            })}
            <div className={spacer} />
            <SidebarButton
              sidebarOrientation={orientation}
              layoutId="whats-new"
              icon={builtinIcons.newspaper}
              name={t("whatsNew")}
              withRedDot={hasUnreadReleaseNotes ?? false}
              onClick={onOpenWhatsNew}
            />
            <SidebarButton
              sidebarOrientation={orientation}
              layoutId="cloud-account"
              icon={builtinIcons.personCircle}
              name={cloudConnected ? t("cloud.account") : t("cloud.connect")}
              withRedDot={cloudBehindSchema ?? false}
              onClick={onOpenCloudAccount}
            />
            <SidebarButton
              sidebarOrientation={orientation}
              layoutId="edit-folder"
              icon={builtinIcons.pencil}
              name={t("editFolder")}
              onClick={onToggleEditMode}
            />
            <SidebarButton
              sidebarOrientation={orientation}
              layoutId="settings"
              icon={builtinIcons.settings}
              name={t("settings.title")}
              onClick={onOpenSettings}
            />
          </TooltipProvider>
        </div>
      </ScrollArea>
    </div>
  );
});
