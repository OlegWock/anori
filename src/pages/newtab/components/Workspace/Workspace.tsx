import { AnoriPlusSettingsProvider } from "@anori/cloud-integration/anori-plus-settings";
import { useCloudAccount, useIsBehindCloudSchema } from "@anori/cloud-integration/hooks";
import { ShortcutsHelp } from "@anori/components/ShortcutsHelp";
import { WhatsNew } from "@anori/components/WhatsNew";
import { Modal } from "@anori/design-system/components/Modal/Modal";
import { useSizeSettings } from "@anori/utils/compact";
import { FolderContentContext } from "@anori/utils/FolderContentContext";
import { useGridDimensions } from "@anori/utils/grid/useGridDimensions";
import { useHotkeys } from "@anori/utils/hooks";
import { useOverlayLayers } from "@anori/utils/overlay-layers";
import { anoriSchema } from "@anori/utils/storage";
import { useStorageValue } from "@anori/utils/storage-lib";
import { tryMoveWidgetToFolder, useFolderWidgets } from "@anori/utils/user-data/hooks";
import type { Folder, WidgetInFolderWithMeta } from "@anori/utils/user-data/types";
import { AnimatePresence, m } from "motion/react";
import { useCallback, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import useMeasure from "react-use-motion-measure";
import { css, cva } from "styled-system/css";
import { NewWidgetWizard, SettingsModal } from "../../lazy-components";
import type { SettingScreen } from "../../settings/Settings";
import { EditModeToolbar } from "../EditModeToolbar/EditModeToolbar";
import { EditWidgetModal } from "../EditWidgetModal";
import { FolderContent } from "../FolderContent";
import { Sidebar } from "../Sidebar";
import type { LayoutChange } from "../WidgetsGrid";

type WorkspaceProps = {
  folders: Folder[];
  activeFolder: Folder;
  orientation: "vertical" | "horizontal";
  bookmarksBarVisible?: boolean;
  animationDirection: "up" | "down" | "left" | "right" | null;
  onFolderClick: (folder: Folder) => void;
};

const startPageContent = cva({
  base: { display: "flex", flex: 1, overflow: "hidden" },
  variants: { orientation: { vertical: {}, horizontal: { flexDirection: "column-reverse" } } },
});

const widgetsArea = cva({
  base: {
    position: "relative",
    flex: 1,
    borderRadius: "2xl",
    background: "frosted.subtle",
    backdropFilter: "blur(10px)",
    zIndex: 1,
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    minWidth: 0,
  },
  variants: {
    orientation: {
      vertical: { marginBlock: "8", marginInlineStart: 0, marginInlineEnd: "8" },
      horizontal: { marginTop: "8", marginInline: "8", marginBottom: 0 },
    },
    // The bookmarks bar takes the top, so tighten the widgets-area top margin. `!` to win over orientation.
    bookmarksBar: { true: { marginTop: "1!" } },
  },
});

// A "spotlight" scrim: sized to the folder panel, its huge spread box-shadow dims everything *around*
// the panel while its own rect stays transparent — so the translucent panel isn't darkened from behind.
const editingScrim = css({
  position: "fixed",
  zIndex: "docked",
  pointerEvents: "none",
  borderRadius: "2xl",
  boxShadow: "0 0 0 100vmax rgba(0, 0, 0, 0.5)",
});

export const Workspace = ({
  folders,
  activeFolder,
  orientation,
  bookmarksBarVisible,
  animationDirection,
  onFolderClick,
}: WorkspaceProps) => {
  const { t } = useTranslation();
  const { widgets, removeWidget, moveWidget, resizeWidget, updateWidgetConfig } = useFolderWidgets(activeFolder);
  const [isEditing, setIsEditing] = useState(false);
  const [addWidgetWizardVisible, setAddWidgetWizardVisible] = useState(false);
  const [editingWidget, setEditingWidget] = useState<null | WidgetInFolderWithMeta>(null);
  const [settingsScreen, setSettingsScreen] = useState<SettingScreen | null>(null);
  const [shortcutsHelpVisible, setShortcutsHelpVisible] = useState(false);
  const [whatsNewVisible, setWhatsNewVisible] = useState(false);
  const [hasUnreadReleaseNotes, setHasUnreadReleaseNotes] = useStorageValue(anoriSchema.hasUnreadReleaseNotes);
  const { isConnected } = useCloudAccount();
  const isBehindCloudSchema = useIsBehindCloudSchema();

  const { blockSize, minBlockSize } = useSizeSettings();
  const mainRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const gridDimensions = useGridDimensions(scrollAreaRef, blockSize, minBlockSize, widgets);
  const [panelRef, panelBounds] = useMeasure();

  const handleLayoutUpdate = useCallback(
    (changes: LayoutChange[]) => {
      changes.forEach(async (ch) => {
        if (ch.type === "remove") {
          removeWidget(ch.instanceId);
        } else if (ch.type === "change-position") {
          moveWidget(ch.instanceId, ch.newPosition);
        } else if (ch.type === "move-to-folder") {
          tryMoveWidgetToFolder(activeFolder.id, ch.folderId, ch.instanceId, gridDimensions);
        } else if (ch.type === "resize") {
          resizeWidget(ch.instanceId, { width: ch.width, height: ch.height });
        }
      });
    },
    [activeFolder.id, gridDimensions, removeWidget, moveWidget, resizeWidget],
  );

  useHotkeys("alt+e", () => setIsEditing(true));
  useHotkeys("alt+a", () => {
    setIsEditing(true);
    setAddWidgetWizardVisible(true);
  });
  useHotkeys("alt+h", () => setShortcutsHelpVisible((v) => !v));
  useHotkeys("alt+s", () => setSettingsScreen((screen) => (screen ? null : "general")));

  const overlayLayers = useOverlayLayers();
  useHotkeys(
    "esc",
    () => {
      if (overlayLayers.hasActiveOverlay()) return;
      setIsEditing(false);
    },
    { enabled: isEditing },
  );

  const handleToggleEditMode = useCallback(() => setIsEditing((v) => !v), []);
  const handleDoneEditing = useCallback(() => setIsEditing(false), []);
  const handleAddWidget = useCallback(() => setAddWidgetWizardVisible(true), []);
  const handleOpenWhatsNew = useCallback(() => {
    setWhatsNewVisible(true);
    setHasUnreadReleaseNotes(false);
  }, [setHasUnreadReleaseNotes]);
  const handleOpenCloudAccount = useCallback(() => setSettingsScreen("anori-plus"), []);
  const handleOpenSettings = useCallback(() => setSettingsScreen("general"), []);

  const parentFolderContext = useMemo(
    () => ({ activeFolder, isEditing, grid: gridDimensions, gridRef: mainRef }),
    [activeFolder, isEditing, gridDimensions],
  );

  const shouldShowOnboarding = widgets.length === 0 && !isEditing;

  return (
    <>
      <AnimatePresence>
        {isEditing && (
          <m.div
            key="editing-scrim"
            className={editingScrim}
            style={{
              top: panelBounds.top,
              left: panelBounds.left,
              width: panelBounds.width,
              height: panelBounds.height,
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
        )}
      </AnimatePresence>

      <AnoriPlusSettingsProvider open={handleOpenCloudAccount}>
        <div className={startPageContent({ orientation })}>
          <Sidebar
            folders={folders}
            activeFolder={activeFolder}
            orientation={orientation}
            bookmarksBarVisible={bookmarksBarVisible}
            hasUnreadReleaseNotes={hasUnreadReleaseNotes ?? false}
            cloudConnected={isConnected}
            cloudBehindSchema={isBehindCloudSchema}
            onFolderClick={onFolderClick}
            onToggleEditMode={handleToggleEditMode}
            onOpenWhatsNew={handleOpenWhatsNew}
            onOpenCloudAccount={handleOpenCloudAccount}
            onOpenSettings={handleOpenSettings}
          />

          <div ref={panelRef} className={widgetsArea({ orientation, bookmarksBar: bookmarksBarVisible })}>
            <FolderContentContext.Provider value={parentFolderContext}>
              <FolderContent
                key={activeFolder.id}
                folder={activeFolder}
                animationDirection={animationDirection}
                isEditing={isEditing}
                widgets={widgets}
                gridDimensions={gridDimensions}
                gridRef={mainRef}
                scrollAreaRef={scrollAreaRef}
                onLayoutUpdate={handleLayoutUpdate}
                onEditWidget={setEditingWidget}
                onUpdateWidgetConfig={updateWidgetConfig}
                showOnboarding={shouldShowOnboarding}
              />
            </FolderContentContext.Provider>
            <EditModeToolbar visible={isEditing} onAddWidget={handleAddWidget} onDone={handleDoneEditing} />
          </div>
        </div>
      </AnoriPlusSettingsProvider>

      <AnimatePresence>
        {addWidgetWizardVisible && (
          <NewWidgetWizard
            folder={activeFolder}
            key="new-widget-wizard"
            onClose={() => setAddWidgetWizardVisible(false)}
            gridDimensions={gridDimensions}
            layout={widgets}
          />
        )}

        {!!editingWidget && (
          <EditWidgetModal
            key="edit-widget-modal"
            widget={editingWidget}
            onUpdateConfig={updateWidgetConfig}
            onClose={() => setEditingWidget(null)}
          />
        )}
      </AnimatePresence>

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
        {settingsScreen && <SettingsModal initialScreen={settingsScreen} onClose={() => setSettingsScreen(null)} />}
      </AnimatePresence>
    </>
  );
};
