import { Onboarding } from "@anori/components/Onboarding";
import { WidgetCard } from "@anori/components/WidgetCard/WidgetCard";
import { MotionScrollArea } from "@anori/design-system/components/ScrollArea/ScrollArea";
import type { GridDimensions, GridItemSize, GridPosition } from "@anori/utils/grid/types";
import { canPlaceItemInGrid, GRID_DRAG_EXTEND_SLOTS, positionToPixelPosition } from "@anori/utils/grid/utils";
import type { Mapping } from "@anori/utils/types";
import type { WidgetInFolderWithMeta } from "@anori/utils/user-data/types";
import { AnimatePresence, m } from "motion/react";
import { memo, type Ref, useState } from "react";
import { css, cva } from "styled-system/css";
import { computeDisplacedMoves, resizePushDirection } from "./displacement";
import { useDragSnapPosition } from "./use-drag-snap-position";

const grid = css({ flexGrow: 1, alignSelf: "stretch", position: "relative", display: "flex" });
const gridViewport = css({
  display: "flex",
  flexGrow: 1,
  "& > div": { display: "flex", flexGrow: 1, alignItems: "stretch" },
});
const relativeWrapper = cva({
  base: { position: "relative", flexGrow: 1 },
  variants: { onboarding: { true: { display: "flex", justifyContent: "center", alignItems: "center" } } },
});

const ghostRect = css({
  position: "absolute",
  top: 0,
  left: 0,
  background: "frosted.strong",
  borderRadius: "lg",
  userSelect: "none",
  pointerEvents: "none",
});

const ghostSpring = { type: "spring", duration: 0.25, bounce: 0.1 } as const;

export type LayoutChange =
  | {
      type: "change-position";
      instanceId: string;
      newPosition: GridPosition;
    }
  | {
      type: "move-to-folder";
      instanceId: string;
      folderId: string;
    }
  | {
      type: "remove";
      instanceId: string;
    }
  | {
      type: "resize";
      instanceId: string;
      width: number;
      height: number;
    };

export type WidgetsGridProps = {
  isEditing: boolean;
  gridDimensions: GridDimensions;
  gapSize: number;
  layout: WidgetInFolderWithMeta[];
  onEditWidget: (w: WidgetInFolderWithMeta) => void;
  onUpdateWidgetConfig: (instaceId: string, config: Partial<Mapping>) => void;
  onLayoutUpdate?: (changes: LayoutChange[]) => void;
  showOnboarding?: boolean;
  gridRef?: Ref<HTMLDivElement>;
  scrollAreaRef?: Ref<HTMLDivElement>;
};

export const WidgetsGrid = memo(function WidgetsGrid({
  gridDimensions,
  gapSize,
  layout,
  onUpdateWidgetConfig,
  onEditWidget,
  showOnboarding,
  onLayoutUpdate = () => {},
  gridRef,
  scrollAreaRef,
}: WidgetsGridProps) {
  const tryRepositionWidget = (widget: WidgetInFolderWithMeta, position: GridPosition) => {
    const canPlaceThere = canPlaceItemInGrid({
      grid: gridDimensions,
      item: widget,
      layout: layout.filter((w) => w.instanceId !== widget.instanceId),
      position,
      allowOutOfBounds: true,
    });
    if (canPlaceThere) {
      onLayoutUpdate([{ type: "change-position", instanceId: widget.instanceId, newPosition: position }]);
    }
  };

  const clampSizeToExtendedGrid = (widget: WidgetInFolderWithMeta, size: GridItemSize): GridItemSize => ({
    width: Math.min(size.width, gridDimensions.columns + GRID_DRAG_EXTEND_SLOTS - widget.x),
    height: Math.min(size.height, gridDimensions.rows + GRID_DRAG_EXTEND_SLOTS - widget.y),
  });

  const tryResizeWidget = (widget: WidgetInFolderWithMeta, widthInBoxes: number, heightInBoxes: number) => {
    ({ width: widthInBoxes, height: heightInBoxes } = clampSizeToExtendedGrid(widget, {
      width: widthInBoxes,
      height: heightInBoxes,
    }));

    if (widget.width === widthInBoxes && widget.height === heightInBoxes) {
      return false;
    }
    const moves = computeDisplacedMoves(
      gridDimensions,
      layout,
      { ...widget, width: widthInBoxes, height: heightInBoxes },
      { x: widget.x, y: widget.y },
      resizePushDirection(widget, { width: widthInBoxes, height: heightInBoxes }),
    );
    if (!moves) return false;
    onLayoutUpdate([
      {
        type: "resize",
        instanceId: widget.instanceId,
        width: widthInBoxes,
        height: heightInBoxes,
      },
      ...moves.map((move) => ({
        type: "change-position" as const,
        instanceId: move.instanceId,
        newPosition: move.position,
      })),
    ]);
    return true;
  };

  const convertUnitsToPixels = (unit: number) => unit * gridDimensions.boxSize - gapSize * 2;

  const snap = useDragSnapPosition(gridDimensions, layout, (moves) => {
    onLayoutUpdate(
      moves.map((move) => ({ type: "change-position", instanceId: move.instanceId, newPosition: move.position })),
    );
  });
  const [resizePreview, setResizePreview] = useState<{ instanceId: string; width: number; height: number } | null>(
    null,
  );
  const resizeItem = resizePreview ? layout.find((w) => w.instanceId === resizePreview.instanceId) : undefined;
  const resizeMoves =
    resizePreview && resizeItem
      ? computeDisplacedMoves(
          gridDimensions,
          layout,
          { ...resizeItem, width: resizePreview.width, height: resizePreview.height },
          { x: resizeItem.x, y: resizeItem.y },
          resizePushDirection(resizeItem, resizePreview),
        )
      : null;

  const snapOverrideFor = (instanceId: string): GridPosition | undefined => {
    if (snap) {
      if (snap.instanceId === instanceId) return snap.position;
      const displaced = snap.displaced.find((m) => m.instanceId === instanceId);
      if (displaced) return displaced.position;
    }
    return resizeMoves?.find((m) => m.instanceId === instanceId)?.position;
  };
  const effectivePosition = (w: WidgetInFolderWithMeta): GridPosition => snapOverrideFor(w.instanceId) ?? w;
  const effectiveSize = (w: WidgetInFolderWithMeta): GridItemSize =>
    resizePreview && resizePreview.instanceId === w.instanceId ? resizePreview : w;
  const draggedItem = snap ? layout.find((w) => w.instanceId === snap.instanceId) : undefined;

  const ghost =
    snap && draggedItem
      ? { position: snap.position, width: draggedItem.width, height: draggedItem.height }
      : resizePreview && resizeItem
        ? { position: { x: resizeItem.x, y: resizeItem.y }, width: resizePreview.width, height: resizePreview.height }
        : null;

  const maxWidthPx =
    convertUnitsToPixels(
      Math.max(0, ...layout.map((w) => Math.max(w.x + w.width, effectivePosition(w).x + effectiveSize(w).width))),
    ) +
    gapSize * 2;
  const maxHeightPx =
    convertUnitsToPixels(
      Math.max(0, ...layout.map((w) => Math.max(w.y + w.height, effectivePosition(w).y + effectiveSize(w).height))),
    ) +
    gapSize * 2;

  return (
    <MotionScrollArea
      className={grid}
      viewportClassName={gridViewport}
      layout
      layoutRoot
      layoutScroll
      direction="both"
      type="hover"
      color="translucent"
      ref={scrollAreaRef}
    >
      <div className={relativeWrapper({ onboarding: showOnboarding })} ref={gridRef}>
        <AnimatePresence initial={false}>
          <div
            style={{
              width: maxWidthPx,
              height: maxHeightPx,
              background: "wheat",
              pointerEvents: "none",
              opacity: 0,
            }}
          />
          {layout.map((w) => {
            return (
              <WidgetCard
                type="widget"
                widget={w.widget}
                plugin={w.plugin}
                instanceId={w.instanceId}
                config={w.configuration}
                key={w.instanceId}
                size={w}
                position={w}
                onUpdateConfig={onUpdateWidgetConfig}
                onRemove={() => onLayoutUpdate([{ type: "remove", instanceId: w.instanceId }])}
                onEdit={w.widget.configurationScreen ? () => onEditWidget(w) : undefined}
                onResize={(width, height) => tryResizeWidget(w, width, height)}
                onResizePreview={(previewSize) =>
                  setResizePreview(
                    previewSize ? { instanceId: w.instanceId, ...clampSizeToExtendedGrid(w, previewSize) } : null,
                  )
                }
                onMoveToFolder={(folderId) =>
                  onLayoutUpdate([{ type: "move-to-folder", instanceId: w.instanceId, folderId: folderId }])
                }
                onPositionChange={(p) => tryRepositionWidget(w, p)}
                dragSnapPosition={snap && snap.instanceId === w.instanceId ? undefined : snapOverrideFor(w.instanceId)}
              />
            );
          })}
        </AnimatePresence>

        {ghost && (
          <m.div
            className={ghostRect}
            initial={false}
            animate={{
              x: positionToPixelPosition({ grid: gridDimensions, position: ghost.position }).x,
              y: positionToPixelPosition({ grid: gridDimensions, position: ghost.position }).y,
              width: convertUnitsToPixels(ghost.width),
              height: convertUnitsToPixels(ghost.height),
            }}
            transition={ghostSpring}
            style={{ margin: gapSize }}
          />
        )}

        {showOnboarding && <Onboarding gridDimensions={gridDimensions} />}
      </div>
    </MotionScrollArea>
  );
});
