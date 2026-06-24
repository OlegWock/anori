import { useCloudAccount, useIsBehindCloudSchema } from "@anori/cloud-integration/hooks";
import { ShortcutsHelp } from "@anori/components/ShortcutsHelp";
import { SidebarButton } from "@anori/components/SidebarButton/SidebarButton";
import { WhatsNew } from "@anori/components/WhatsNew";
import { builtinIcons } from "@anori/design-system/components/Icon/builtin-icons";
import { Modal } from "@anori/design-system/components/Modal/Modal";
import { ScrollArea } from "@anori/design-system/components/ScrollArea/ScrollArea";
import { TooltipProvider } from "@anori/design-system/components/Tooltip/Tooltip";
import { useHotkeys } from "@anori/utils/hooks";
import { anoriSchema } from "@anori/utils/storage";
import { useStorageValue } from "@anori/utils/storage-lib";
import type { Folder } from "@anori/utils/user-data/types";
import { AnimatePresence } from "motion/react";
import { memo, useState } from "react";
import { useTranslation } from "react-i18next";
import { css, cva } from "styled-system/css";
import { CloudAccountModal, SettingsModal } from "../lazy-components";

export type SidebarProps = {
  folders: Folder[];
  activeFolder: Folder;
  orientation: "vertical" | "horizontal";
  bookmarksBarVisible?: boolean;
  onFolderClick: (folder: Folder) => void;
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
  zIndex: 1,
  maxHeight: "100%",
  minHeight: "100%",
  display: "var(--sidebar-display, flex) !important",
});

const sidebarViewport = cva({
  base: {
    flexGrow: 1,
    display: "flex",
    flexDirection: "column",
    "& > .ScrollAreaContent": {
      flexGrow: 1,
      height: "100%",
      minHeight: "100%",
      display: "flex",
    },
  },
  variants: {
    orientation: {
      vertical: {},
      horizontal: { "& > .ScrollAreaContent": { flexDirection: "column" } },
    },
  },
});

const sidebarContent = cva({
  base: { display: "flex !important", gap: "8", _compact: { gap: "6" } },
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
  onFolderClick,
}: SidebarProps) {
  const { t } = useTranslation();
  const [hasUnreadReleaseNotes, setHasUnreadReleaseNotes] = useStorageValue(anoriSchema.hasUnreadReleaseNotes);
  const [autoHideSidebar] = useStorageValue(anoriSchema.autoHideSidebar);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [shortcutsHelpVisible, setShortcutsHelpVisible] = useState(false);
  const [whatsNewVisible, setWhatsNewVisible] = useState(false);
  const [cloudModalVisible, setCloudModalVisible] = useState(false);
  const { isConnected } = useCloudAccount();
  const isBehindCloudSchema = useIsBehindCloudSchema();

  useHotkeys("alt+h", () => setShortcutsHelpVisible((v) => !v));
  useHotkeys("alt+s", () => setSettingsVisible((v) => !v));

  return (
    <>
      <div
        className={sidebarWrapper({
          orientation,
          autohide: autoHideSidebar ?? false,
          bookmarksBar: bookmarksBarVisible ?? false,
        })}
      >
        <ScrollArea
          className={sidebar}
          contentClassName={sidebarViewport({ orientation })}
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
                onClick={() => {
                  setWhatsNewVisible(true);
                  setHasUnreadReleaseNotes(false);
                }}
              />
              <SidebarButton
                sidebarOrientation={orientation}
                layoutId="cloud-account"
                icon={builtinIcons.personCircle}
                name={isConnected ? t("cloud.account") : t("cloud.connect")}
                withRedDot={isBehindCloudSchema}
                onClick={() => setCloudModalVisible(true)}
              />
              <SidebarButton
                sidebarOrientation={orientation}
                layoutId="settings"
                icon={builtinIcons.settings}
                name={t("settings.title")}
                onClick={() => setSettingsVisible(true)}
              />
            </TooltipProvider>
          </div>
        </ScrollArea>
      </div>

      <AnimatePresence>
        {shortcutsHelpVisible && (
          <Modal title={t("shortcuts.title")} closable onClose={() => setShortcutsHelpVisible(false)}>
            <ShortcutsHelp />
          </Modal>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {whatsNewVisible && (
          <Modal title={t("whatsNew")} flush closable onClose={() => setWhatsNewVisible(false)}>
            <WhatsNew />
          </Modal>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {settingsVisible && <SettingsModal onClose={() => setSettingsVisible(false)} />}
      </AnimatePresence>

      <AnimatePresence>
        {cloudModalVisible && <CloudAccountModal onClose={() => setCloudModalVisible(false)} />}
      </AnimatePresence>
    </>
  );
});
