import { Onboarding } from "@anori/components/Onboarding";
import { WidgetCard } from "@anori/components/WidgetCard/WidgetCard";
import { MotionScrollArea } from "@anori/design-system/components/ScrollArea/ScrollArea";
import { useParentFolder } from "@anori/utils/FolderContentContext";
import type { GridDimensions, GridPosition } from "@anori/utils/grid/types";
import {
  canPlaceItemInGrid,
  layoutTo2DArray,
  positionToPixelPosition,
  snapPixelPositionToGrid,
  willItemOverlay,
} from "@anori/utils/grid/utils";
import { useMirrorStateToRef } from "@anori/utils/hooks";
import type { Mapping } from "@anori/utils/types";
import type { WidgetInFolderWithMeta } from "@anori/utils/user-data/types";
import { useDragDropMonitor } from "@dnd-kit/react";
import { AnimatePresence, m } from "motion/react";
import { memo, type Ref, useRef, useState } from "react";
import { css, cva } from "styled-system/css";

const grid = css({ flexGrow: 1, alignSelf: "stretch", position: "relative", display: "flex" });
// Make the ScrollArea content (and the grid wrapper inside it) flex so the grid fills the viewport.
const gridViewport = css({
  display: "flex",
  flexGrow: 1,
  "& > div": { display: "flex", flexGrow: 1, alignItems: "stretch" },
});
const relativeWrapper = cva({
  base: { position: "relative", flexGrow: 1 },
  // Empty folder: center the onboarding within the grid area.
  variants: { onboarding: { true: { display: "flex", justifyContent: "center", alignItems: "center" } } },
});

const placeholderCell = css({
  position: "absolute",
  top: 0,
  left: 0,
  background: "frosted.strong",
  borderRadius: "lg",
  userSelect: "none",
  pointerEvents: "none",
});

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

const useDragSnapPosition = (
  gridDimensions: GridDimensions,
  layout: WidgetInFolderWithMeta[],
  onDrop: (instanceId: string, position: GridPosition) => void,
) => {
  const { gridRef } = useParentFolder();
  const [snap, setSnap] = useState<{ instanceId: string; position: GridPosition } | null>(null);
  const snapRef = useMirrorStateToRef(snap);
  const dragStartRect = useRef<DOMRect | null>(null);

  useDragDropMonitor({
    onDragStart(event) {
      const { source } = event.operation;
      if (!source || source.type !== "widget") return;
      dragStartRect.current = gridRef.current?.getBoundingClientRect() ?? null;
    },
    onDragMove(event) {
      const { source } = event.operation;
      if (!source || source.type !== "widget") return;
      const item = layout.find((w) => w.instanceId === source.id);
      if (!item || !gridRef.current) return;

      let position: GridPosition | null = null;
      const rectNow = gridRef.current.getBoundingClientRect();
      if (!dragStartRect.current) dragStartRect.current = rectNow;
      // Autoscroll moves the grid under the pointer mid-drag; the grid origin's drift since drag
      // start converts the viewport-space pointer delta into content space.
      const scrollShift = {
        x: rectNow.x - dragStartRect.current.x,
        y: rectNow.y - dragStartRect.current.y,
      };
      const { current, initial } = event.operation.position;
      const storedPixel = positionToPixelPosition({ grid: gridDimensions, position: item });
      const virtualCorner = {
        x: storedPixel.x + current.x - initial.x - scrollShift.x,
        y: storedPixel.y + current.y - initial.y - scrollShift.y,
      };
      const snapPosition = snapPixelPositionToGrid({ grid: gridDimensions, position: virtualCorner });
      const canPlace = canPlaceItemInGrid({
        grid: gridDimensions,
        item,
        layout: layout.filter((w) => w.instanceId !== item.instanceId),
        position: snapPosition,
        allowOutOfBounds: true,
      });
      if (canPlace) position = snapPosition;

      setSnap((prev) => {
        if (prev === null && position === null) return prev;
        if (
          prev &&
          position &&
          prev.instanceId === item.instanceId &&
          prev.position.x === position.x &&
          prev.position.y === position.y
        ) {
          return prev;
        }
        return position ? { instanceId: item.instanceId, position } : null;
      });
    },
    onDragEnd(event) {
      const lastSnap = snapRef.current;
      setSnap(null);
      dragStartRect.current = null;
      if (event.canceled) return;
      const { source } = event.operation;
      if (!source || source.type !== "widget") return;
      if (lastSnap && lastSnap.instanceId === source.id) {
        onDrop(lastSnap.instanceId, lastSnap.position);
      }
    },
  });

  return snap;
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
  isEditing,
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

  const tryResizeWidget = (widget: WidgetInFolderWithMeta, widthInBoxes: number, heightInBoxes: number) => {
    console.log("Trying to resize widget", widget, `to ${widthInBoxes}x${heightInBoxes}`);

    if (widget.x + widthInBoxes > gridDimensions.columns) widthInBoxes = gridDimensions.columns - widget.x;
    if (widget.y + heightInBoxes > gridDimensions.rows) heightInBoxes = gridDimensions.rows - widget.y;

    const isOverlays = willItemOverlay({
      arr: layoutTo2DArray({
        grid: gridDimensions,
        layout: layout.filter((w) => w.instanceId !== widget.instanceId),
      }),
      item: {
        ...widget,
        width: widthInBoxes,
        height: heightInBoxes,
      },
    });

    if (!isOverlays) {
      if (widget.width === widthInBoxes && widget.height === heightInBoxes) {
        return false;
      }
      onLayoutUpdate([
        {
          type: "resize",
          instanceId: widget.instanceId,
          width: widthInBoxes,
          height: heightInBoxes,
        },
      ]);
      console.log("Resized");
      return true;
    }

    console.log("Not resized");
    return false;
  };

  const convertUnitsToPixels = (unit: number) => unit * gridDimensions.boxSize - gapSize * 2;

  const maxWidthPx = convertUnitsToPixels(Math.max(0, ...layout.map((w) => w.x + w.width))) + gapSize * 2;
  const maxHeightPx = convertUnitsToPixels(Math.max(0, ...layout.map((w) => w.y + w.height))) + gapSize * 2;

  const snap = useDragSnapPosition(gridDimensions, layout, (instanceId, position) => {
    const widget = layout.find((w) => w.instanceId === instanceId);
    if (widget) tryRepositionWidget(widget, position);
  });

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
        <AnimatePresence>
          {isEditing &&
            new Array(gridDimensions.columns * gridDimensions.rows).fill(null).map((_, i) => {
              const x = i % gridDimensions.columns;
              const y = Math.floor(i / gridDimensions.columns);
              const position = positionToPixelPosition({ grid: gridDimensions, position: { x, y } });
              return (
                <m.div
                  className={placeholderCell}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.18 }}
                  key={`${x}_${y}`}
                  style={{
                    y: position.y,
                    x: position.x,
                    margin: gapSize,
                    width: gridDimensions.boxSize - gapSize * 2,
                    height: gridDimensions.boxSize - gapSize * 2,
                  }}
                />
              );
            })}
        </AnimatePresence>

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
                onMoveToFolder={(folderId) =>
                  onLayoutUpdate([{ type: "move-to-folder", instanceId: w.instanceId, folderId: folderId }])
                }
                onPositionChange={(p) => tryRepositionWidget(w, p)}
                dragSnapPosition={snap && snap.instanceId === w.instanceId ? snap.position : undefined}
              />
            );
          })}
        </AnimatePresence>

        {showOnboarding && <Onboarding gridDimensions={gridDimensions} />}
      </div>
    </MotionScrollArea>
  );
});
