import { useCloudAccount } from "@anori/cloud-integration/hooks";
import { ShortcutsHelp } from "@anori/components/ShortcutsHelp";
import { SidebarButton } from "@anori/components/SidebarButton/SidebarButton";
import { WhatsNew } from "@anori/components/WhatsNew";
import { builtinIcons } from "@anori/design-system/components/Icon/builtin-icons";
import { Modal } from "@anori/design-system/components/Modal/Modal";
import { ScrollArea } from "@anori/design-system/components/ScrollArea/ScrollArea";
import { useHotkeys } from "@anori/utils/hooks";
import { anoriSchema } from "@anori/utils/storage";
import { useStorageValue } from "@anori/utils/storage-lib";
import type { Folder } from "@anori/utils/user-data/types";
import { FloatingDelayGroup } from "@floating-ui/react";
import clsx from "clsx";
import { AnimatePresence } from "framer-motion";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { css, cva } from "styled-system/css";
import browser from "webextension-polyfill";
import { CloudAccountModal, SettingsModal } from "../lazy-components";

export type SidebarProps = {
  folders: Folder[];
  activeFolder: Folder;
  orientation: "vertical" | "horizontal";
  onFolderClick: (folder: Folder) => void;
};

const sidebarWrapper = cva({
  base: { paddingBlock: "7", paddingInline: "2", overflow: "hidden" },
  // Real `:hover` (not @media hover) so touch users can reveal the hidden sidebar by tapping it.
  variants: {
    autohide: {
      true: {
        paddingInline: "4",
        "--sidebar-display": "none",
        "&:hover": { paddingInline: "2", "--sidebar-display": "flex" },
      },
    },
  },
});

const sidebar = css({
  flexGrow: 0,
  flexShrink: 0,
  zIndex: 1,
  maxHeight: "100%",
  minHeight: "100%",
  // Shown by default; the wrapper's autohide variant flips this var. `!` to beat the ScrollArea's own display.
  display: "var(--sidebar-display, flex) !important",
});

const sidebarViewport = css({
  flexGrow: 1,
  display: "flex",
  flexDirection: "column",
  "& > div[style]:not(#specifity-bump)": {
    flexGrow: 1,
    height: "100%",
    minHeight: "100%",
    display: "flex !important",
  },
});

const sidebarContent = css({
  display: "flex !important",
  flexDirection: "column",
  gap: "8",
  paddingBlock: "3",
  paddingInline: "6",
  _compact: { gap: "6" },
});

const spacer = css({ flexGrow: 1 });

export const Sidebar = ({ folders, activeFolder, orientation, onFolderClick }: SidebarProps) => {
  const { t } = useTranslation();
  const [hasUnreadReleaseNotes, setHasUnreadReleaseNotes] = useStorageValue(anoriSchema.hasUnreadReleaseNotes);
  const [autoHideSidebar] = useStorageValue(anoriSchema.autoHideSidebar);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [shortcutsHelpVisible, setShortcutsHelpVisible] = useState(false);
  const [whatsNewVisible, setWhatsNewVisible] = useState(false);
  const [cloudModalVisible, setCloudModalVisible] = useState(false);
  const { isConnected } = useCloudAccount();

  useHotkeys("alt+h", () => setShortcutsHelpVisible((v) => !v));
  useHotkeys("alt+s", () => setSettingsVisible((v) => !v));

  return (
    <>
      {/* The page layout (newtab styles.scss: horizontal-sidebar / bookmarks-bar) still targets these
          marker classes, so they're kept alongside the Panda styles until that migrates too. */}
      <div className={clsx(sidebarWrapper({ autohide: autoHideSidebar ?? false }), "sidebar-wrapper")}>
        <ScrollArea
          className={clsx(sidebar, "sidebar")}
          contentClassName={clsx(sidebarViewport, "sidebar-viewport")}
          type="hover"
          direction={orientation}
          mirrorVerticalScrollToHorizontal
        >
          <div className={clsx(sidebarContent, "sidebar-content")}>
            <FloatingDelayGroup delay={{ open: 50, close: 50 }}>
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
                onClick={() => setCloudModalVisible(true)}
              />
              <SidebarButton
                sidebarOrientation={orientation}
                layoutId="settings"
                icon={builtinIcons.settings}
                name={t("settings.title")}
                onClick={() => setSettingsVisible(true)}
              />
              {X_MODE === "development" && (
                <SidebarButton
                  sidebarOrientation={orientation}
                  layoutId="kitchen-sink"
                  icon={builtinIcons.palette}
                  name="Kitchen sink"
                  onClick={() => browser.tabs.create({ url: browser.runtime.getURL("/pages/kitchen-sink/index.html") })}
                />
              )}
            </FloatingDelayGroup>
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
          <Modal
            title={t("whatsNew")}
            className="WhatsNew-modal"
            flush
            closable
            onClose={() => setWhatsNewVisible(false)}
          >
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
};
