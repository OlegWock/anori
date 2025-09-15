import { AnimatePresence, m } from "framer-motion";
import "./FolderContent.scss";
import { Button } from "@anori/components/Button";
import { Icon } from "@anori/components/Icon";
import { Modal } from "@anori/components/Modal";
import { ScrollArea } from "@anori/components/ScrollArea";
import { FolderContentContext } from "@anori/utils/FolderContentContext";
import { useSizeSettings } from "@anori/utils/compact";
import { useGrid } from "@anori/utils/grid";
import { useHotkeys } from "@anori/utils/hooks";
import { tryMoveWidgetToFolder, useFolderWidgets } from "@anori/utils/user-data/hooks";
import type { Folder, WidgetInFolderWithMeta } from "@anori/utils/user-data/types";
import clsx from "clsx";
import { atom, useAtom } from "jotai";
import { type CSSProperties, type Ref, Suspense, lazy, useState } from "react";
import { useRef } from "react";
import { useTranslation } from "react-i18next";
import IonAdd from "~icons/ion/add?raw";
import IonCheckmark from "~icons/ion/checkmark?raw";
import IonPencil from "~icons/ion/pencil?raw";
import { type LayoutChange, WidgetsGrid } from "./WidgetsGrid";

const NewWidgetWizard = lazy(() => import("./NewWidgetWizard").then((m) => ({ default: m.NewWidgetWizard })));

type FolderContentProps = {
  folder: Folder;
  animationDirection: "up" | "down" | "left" | "right" | null;
  ref?: Ref<HTMLDivElement>;
};

const variants = {
  visible: {
    translateY: "0%",
    translateX: "0%",
    opacity: 1,
  },
  initial: (custom: "up" | "down" | "left" | "right") => {
    if (custom === "up") {
      return {
        translateY: "-35%",
        opacity: 0,
      };
    }
    if (custom === "down") {
      return {
        translateY: "35%",
        opacity: 0,
      };
    }
    if (custom === "left") {
      return {
        translateX: "-35%",
        opacity: 0,
      };
    }
    if (custom === "right") {
      return {
        translateX: "35%",
        opacity: 0,
      };
    }
    return {
      opacity: 0,
    };
  },
};

const actionButtonAnimations = {
  transition: {
    ease: "linear",
    duration: 0.1,
  },
  initial: {
    translateY: "-50%",
    opacity: 0,
  },
  animate: {
    translateY: 0,
    opacity: 1,
  },
  exit: {
    translateY: "50%",
    opacity: 0,
  },
};

const isEditingModeActiveAtom = atom(false);

export const FolderContent = ({ folder, animationDirection, ref }: FolderContentProps) => {
  const onLayoutUpdate = (changes: LayoutChange[]) => {
    changes.forEach(async (ch) => {
      if (ch.type === "remove") {
        removeWidget(ch.instanceId);
      } else if (ch.type === "change-position") {
        moveWidget(ch.instanceId, ch.newPosition);
      } else if (ch.type === "move-to-folder") {
        tryMoveWidgetToFolder(folder.id, ch.folderId, ch.instanceId, gridDimensions);
      } else if (ch.type === "resize") {
        resizeWidget(ch.instanceId, { width: ch.width, height: ch.height });
      }
    });
  };

  const { widgets, removeWidget, moveWidget, resizeWidget, updateWidgetConfig, folderDataLoaded } =
    useFolderWidgets(folder);
  const [isEditing, setIsEditing] = useAtom(isEditingModeActiveAtom);
  const [newWidgetWizardVisible, setNewWidgetWizardVisible] = useState(false);
  const [editingWidget, setEditingWidget] = useState<null | WidgetInFolderWithMeta<any, any, any>>(null);

  const { blockSize, minBlockSize, gapSize } = useSizeSettings();
  const { t } = useTranslation();
  const mainRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const gridDimensions = useGrid(scrollAreaRef, blockSize, minBlockSize, widgets);

  const shouldShowOnboarding = widgets.length === 0 && folderDataLoaded && !isEditing;

  useHotkeys("alt+e", () => {
    setIsEditing(true);
    setNewWidgetWizardVisible(true);
  });

  useHotkeys("alt+a", () => {
    setIsEditing(true);
    setNewWidgetWizardVisible(true);
  });

  return (
    <>
      <FolderContentContext.Provider
        value={{
          activeFolder: folder,
          isEditing,
          grid: gridDimensions,
          gridRef: mainRef,
        }}
      >
        <m.div
          key={`FolderContent-${folder.id}`}
          data-folder-id={folder.id}
          className={clsx("FolderContent", shouldShowOnboarding && "onboarding-visible")}
          transition={{
            duration: 0.2,
            type: "spring",
          }}
          variants={variants}
          initial="initial"
          animate="visible"
          custom={animationDirection}
          style={
            {
              "--widget-box-size": gridDimensions.boxSize,
              "--widget-box-size-px": `${gridDimensions.boxSize}px`,
              "--widget-box-percent": (gridDimensions.boxSize - minBlockSize) / (blockSize - minBlockSize),
            } as CSSProperties
          }
          ref={ref}
        >
          <header
            style={{
              marginLeft: gapSize,
              marginRight: gapSize,
            }}
          >
            <h1>{folder.name}</h1>

            <div className="action-buttons-wrapper">
              <AnimatePresence initial={false} mode="wait">
                {isEditing && (
                  <m.div className="action-buttons" key="editing-buttons" {...actionButtonAnimations}>
                    <Button onClick={() => setNewWidgetWizardVisible(true)}>
                      <Icon icon={IonAdd} height={24} />
                    </Button>

                    <Button onClick={() => setIsEditing(false)}>
                      <Icon icon={IonCheckmark} height={24} />
                    </Button>
                  </m.div>
                )}

                {!isEditing && (
                  <m.div className="action-buttons" key="viewing-buttons" {...actionButtonAnimations}>
                    <Button onClick={() => setIsEditing(true)} key="start-editing" {...actionButtonAnimations}>
                      <Icon icon={IonPencil} height={24} />
                    </Button>
                  </m.div>
                )}
              </AnimatePresence>
            </div>
          </header>
          <WidgetsGrid
            gridRef={mainRef}
            scrollAreaRef={scrollAreaRef}
            isEditing={isEditing}
            gapSize={gapSize}
            layout={widgets}
            gridDimensions={gridDimensions}
            onEditWidget={setEditingWidget}
            onUpdateWidgetConfig={updateWidgetConfig}
            onLayoutUpdate={onLayoutUpdate}
            showOnboarding={shouldShowOnboarding}
          />
        </m.div>

        <Suspense>
          <AnimatePresence>
            {newWidgetWizardVisible && (
              <NewWidgetWizard
                folder={folder}
                key="new-widget-wizard"
                onClose={() => setNewWidgetWizardVisible(false)}
                gridDimensions={gridDimensions}
                layout={widgets}
              />
            )}

            {!!editingWidget && editingWidget.widget.configurationScreen && (
              <Modal
                title={t("editWidget")}
                key="edit-widget-modal"
                className="edit-widget-modal"
                onClose={() => setEditingWidget(null)}
                closable
              >
                <ScrollArea className="edit-widget-scrollarea">
                  <m.div
                    className="edit-widget-content"
                    transition={{ duration: 0.18 }}
                    animate={{ opacity: 1, translateX: "0%" }}
                  >
                    <editingWidget.widget.configurationScreen
                      instanceId={editingWidget.instanceId}
                      widgetId={editingWidget.widgetId}
                      currentConfig={editingWidget.configuration}
                      saveConfiguration={(config) => {
                        updateWidgetConfig(editingWidget.instanceId, config);
                        setEditingWidget(null);
                      }}
                    />
                  </m.div>
                </ScrollArea>
              </Modal>
            )}
          </AnimatePresence>
        </Suspense>
      </FolderContentContext.Provider>
    </>
  );
};
