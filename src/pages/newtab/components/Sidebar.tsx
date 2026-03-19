import { FolderButton } from "@anori/components/FolderButton";
import { Modal } from "@anori/components/Modal";
import { ScrollArea } from "@anori/components/ScrollArea";
import { ShortcutsHelp } from "@anori/components/ShortcutsHelp";
import { useHotkeys } from "@anori/utils/hooks";
import { useStorageValue } from "@anori/utils/storage-lib";

import type { Folder } from "@anori/utils/user-data/types";
import { FloatingDelayGroup } from "@floating-ui/react";
import { AnimatePresence } from "framer-motion";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import "./Sidebar.scss";
import { useCloudAccount } from "@anori/cloud-integration/hooks";
import { WhatsNew } from "@anori/components/WhatsNew";
import { builtinIcons } from "@anori/components/icon/builtin-icons";
import { anoriSchema } from "@anori/utils/storage";
import clsx from "clsx";
import { CloudAccountModal, SettingsModal } from "../lazy-components";

export type SidebarProps = {
  folders: Folder[];
  activeFolder: Folder;
  orientation: "vertical" | "horizontal";
  onFolderClick: (folder: Folder) => void;
};

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
      <div className={clsx("sidebar-wrapper", (autoHideSidebar ?? false) && "sidebar-autohide")}>
        <ScrollArea
          className="sidebar"
          contentClassName="sidebar-viewport"
          color="translucent"
          type="hover"
          direction={orientation}
          mirrorVerticalScrollToHorizontal
        >
          <div className="sidebar-content">
            <FloatingDelayGroup delay={{ open: 50, close: 50 }}>
              {folders.map((f) => {
                return (
                  <FolderButton
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
              <div className="spacer" />
              <FolderButton
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
              <FolderButton
                sidebarOrientation={orientation}
                layoutId="cloud-account"
                icon={builtinIcons.personCircle}
                name={isConnected ? t("cloud.account") : t("cloud.connect")}
                onClick={() => setCloudModalVisible(true)}
              />
              <FolderButton
                sidebarOrientation={orientation}
                layoutId="settings"
                icon={builtinIcons.settings}
                name={t("settings.title")}
                onClick={() => setSettingsVisible(true)}
              />
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
          <Modal title={t("whatsNew")} className="WhatsNew-modal" closable onClose={() => setWhatsNewVisible(false)}>
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
