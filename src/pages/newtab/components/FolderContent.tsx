import { useSizeSettings } from "@anori/utils/compact";
import type { GridDimensions, GridItemSize, GridPixelPosition } from "@anori/utils/grid/types";
import type { Mapping } from "@anori/utils/types";
import type { Folder, WidgetInFolderWithMeta } from "@anori/utils/user-data/types";
import { m } from "motion/react";
import type { CSSProperties, Ref } from "react";
import { css, cx } from "styled-system/css";
import { type LayoutChange, WidgetsGrid } from "./WidgetsGrid";

type FolderContentProps = {
  folder: Folder;
  animationDirection: "up" | "down" | "left" | "right" | null;
  isEditing: boolean;
  widgets: WidgetInFolderWithMeta[];
  gridDimensions: GridDimensions & { position: GridPixelPosition; pixelSize: GridItemSize };
  gridRef: Ref<HTMLDivElement>;
  scrollAreaRef: Ref<HTMLDivElement>;
  onLayoutUpdate: (changes: LayoutChange[]) => void;
  onEditWidget: (widget: WidgetInFolderWithMeta) => void;
  onUpdateWidgetConfig: (instanceId: string, config: Partial<Mapping>) => void;
  showOnboarding: boolean;
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

export const FolderContent = ({
  folder,
  animationDirection,
  isEditing,
  widgets,
  gridDimensions,
  gridRef,
  scrollAreaRef,
  onLayoutUpdate,
  onEditWidget,
  onUpdateWidgetConfig,
  showOnboarding,
}: FolderContentProps) => {
  const { blockSize, minBlockSize, gapSize } = useSizeSettings();

  return (
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
    >
      <WidgetsGrid
        gridRef={gridRef}
        scrollAreaRef={scrollAreaRef}
        isEditing={isEditing}
        gapSize={gapSize}
        layout={widgets}
        gridDimensions={gridDimensions}
        onEditWidget={onEditWidget}
        onUpdateWidgetConfig={onUpdateWidgetConfig}
        onLayoutUpdate={onLayoutUpdate}
        showOnboarding={showOnboarding}
      />
    </m.div>
  );
};
