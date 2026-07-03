import { Button } from "@anori/design-system/components/Button/Button";
import { Heading } from "@anori/design-system/components/Heading/Heading";
import { builtinIcons } from "@anori/design-system/components/Icon/builtin-icons";
import { IconButton } from "@anori/design-system/components/IconButton/IconButton";
import { useSizeSettings } from "@anori/utils/compact";
import { FolderContentContext } from "@anori/utils/FolderContentContext";
import { useGridDimensions } from "@anori/utils/grid/useGridDimensions";
import { useHotkeys } from "@anori/utils/hooks";
import { tryMoveWidgetToFolder, useFolderWidgets } from "@anori/utils/user-data/hooks";
import type { Folder, WidgetInFolderWithMeta } from "@anori/utils/user-data/types";
import { atom, useAtom } from "jotai";
import { AnimatePresence, m } from "motion/react";
import { type CSSProperties, type Ref, useCallback, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { css, cx } from "styled-system/css";
import { styled } from "styled-system/jsx";
import { NewWidgetWizard } from "../lazy-components";
import { EditWidgetModal } from "./EditWidgetModal";
import { type LayoutChange, WidgetsGrid } from "./WidgetsGrid";

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

const folderChangeTransition = { type: "spring", duration: 0.4, bounce: 0.17 } as const;
const appearTransition = { ease: "easeOut", duration: 0.1 } as const;

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
} as const;

const rootClass = css({
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  alignItems: "center",
  gap: "3",
  flexGrow: 1,
  alignSelf: "stretch",
  padding: "6",
  maxHeight: "100%",
});

const actionButtonsClass = css({ display: "flex", gap: "3" });

const Header = styled("header", {
  base: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    alignSelf: "stretch",
    color: "text.primary",
  },
});

const isEditingModeActiveAtom = atom(false);

export const FolderContent = ({ folder, animationDirection, ref }: FolderContentProps) => {
  const { widgets, removeWidget, moveWidget, resizeWidget, updateWidgetConfig } = useFolderWidgets(folder);
  const [isEditing, setIsEditing] = useAtom(isEditingModeActiveAtom);
  const [newWidgetWizardVisible, setNewWidgetWizardVisible] = useState(false);
  const [editingWidget, setEditingWidget] = useState<null | WidgetInFolderWithMeta>(null);

  const { blockSize, minBlockSize, gapSize } = useSizeSettings();
  const { t } = useTranslation();
  const mainRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const gridDimensions = useGridDimensions(scrollAreaRef, blockSize, minBlockSize, widgets);

  const onLayoutUpdate = useCallback(
    (changes: LayoutChange[]) => {
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
    },
    [folder.id, gridDimensions, removeWidget, moveWidget, resizeWidget],
  );

  const shouldShowOnboarding = widgets.length === 0 && !isEditing;

  const parentFolderContext = useMemo(
    () => ({ activeFolder: folder, isEditing, grid: gridDimensions, gridRef: mainRef }),
    [folder, isEditing, gridDimensions],
  );

  useHotkeys("alt+e", () => {
    setIsEditing(true);
  });

  useHotkeys("alt+a", () => {
    setIsEditing(true);
    setNewWidgetWizardVisible(true);
  });

  return (
    <FolderContentContext.Provider value={parentFolderContext}>
      <m.div
        key={`FolderContent-${folder.id}`}
        data-folder-id={folder.id}
        className={cx(rootClass, "FolderContent")}
        transition={animationDirection ? folderChangeTransition : appearTransition}
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
        <Header style={{ marginTop: gapSize, marginLeft: gapSize, marginRight: gapSize }}>
          <Heading level={1}>{folder.name}</Heading>

          <AnimatePresence initial={false} mode="wait">
            {isEditing && (
              <m.div className={actionButtonsClass} key="editing-buttons" {...actionButtonAnimations}>
                <Button
                  variant="secondary"
                  iconStart={builtinIcons.add}
                  onClick={() => setNewWidgetWizardVisible(true)}
                >
                  {t("addWidget")}
                </Button>

                <Button variant="primary" iconStart={builtinIcons.check} onClick={() => setIsEditing(false)}>
                  {t("done")}
                </Button>
              </m.div>
            )}

            {!isEditing && (
              <m.div className={actionButtonsClass} key="viewing-buttons" {...actionButtonAnimations}>
                {/* TODO: this has poor contrast with background on some of light themes */}
                <IconButton
                  variant="frosted"
                  icon={builtinIcons.pencil}
                  label={t("edit")}
                  onClick={() => setIsEditing(true)}
                />
              </m.div>
            )}
          </AnimatePresence>
        </Header>
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

        {!!editingWidget && (
          <EditWidgetModal
            key="edit-widget-modal"
            widget={editingWidget}
            onUpdateConfig={updateWidgetConfig}
            onClose={() => setEditingWidget(null)}
          />
        )}
      </AnimatePresence>
    </FolderContentContext.Provider>
  );
};
