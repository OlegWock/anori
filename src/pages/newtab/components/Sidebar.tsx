import { FolderButton } from "@anori/components/FolderButton";
import { Modal } from "@anori/components/Modal";
import { ScrollArea } from "@anori/components/ScrollArea";
import { ShortcutsHelp } from "@anori/components/ShortcutsHelp";
import { useHotkeys } from "@anori/utils/hooks";
import { useBrowserStorageValue } from "@anori/utils/storage/api";
import type { Folder } from "@anori/utils/user-data/types";
import { FloatingDelayGroup } from "@floating-ui/react";
import { AnimatePresence } from "framer-motion";
import { Suspense, lazy, useState } from "react";
import { useTranslation } from "react-i18next";
import "./Sidebar.scss";
import { builtinIcons } from "@anori/utils/builtin-icons";
import clsx from "clsx";

const SettingsModal = lazy(() => import("../settings/Settings").then((m) => ({ default: m.SettingsModal })));
const WhatsNew = lazy(() => import("@anori/components/WhatsNew").then((m) => ({ default: m.WhatsNew })));

export type SidebarProps = {
  folders: Folder[];
  activeFolder: Folder;
  orientation: "vertical" | "horizontal";
  onFolderClick: (folder: Folder) => void;
};

export const Sidebar = ({ folders, activeFolder, orientation, onFolderClick }: SidebarProps) => {
  const { t } = useTranslation();
  const [hasUnreadReleaseNotes, setHasUnreadReleaseNotes] = useBrowserStorageValue("hasUnreadReleaseNotes", false);
  const [autoHideSidebar] = useBrowserStorageValue("autoHideSidebar", false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [shortcutsHelpVisible, setShortcutsHelpVisible] = useState(false);
  const [whatsNewVisible, setWhatsNewVisible] = useState(false);

  useHotkeys("alt+h", () => setShortcutsHelpVisible((v) => !v));
  useHotkeys("alt+s", () => setSettingsVisible((v) => !v));

  return (
    <>
      <div className={clsx("sidebar-wrapper", autoHideSidebar && "sidebar-autohide")}>
        <ScrollArea
          className="sidebar"
          contentClassName="sidebar-viewport"
          color="translucent"
          type="hover"
          direction={orientation}
          mirrorVerticalScrollToHorizontal
        >
          <div className="sidebar-content">
            {/* @ts-expect-error Declared component type not compatible with React 19 */}
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
                withRedDot={hasUnreadReleaseNotes}
                onClick={() => {
                  setWhatsNewVisible(true);
                  setHasUnreadReleaseNotes(false);
                }}
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
            <Suspense fallback={undefined}>
              <WhatsNew />
            </Suspense>
          </Modal>
        )}
      </AnimatePresence>

      <Suspense fallback={undefined}>
        <AnimatePresence>
          {settingsVisible && <SettingsModal onClose={() => setSettingsVisible(false)} />}
        </AnimatePresence>
      </Suspense>
    </>
  );
};
