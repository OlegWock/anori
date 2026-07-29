import { Onboarding } from "@anori/components/Onboarding";
import { WidgetCard } from "@anori/components/WidgetCard/WidgetCard";
import { MotionScrollArea } from "@anori/design-system/components/ScrollArea/ScrollArea";
import { useParentFolder } from "@anori/utils/FolderContentContext";
import type { GridDimensions, GridItemSize, GridPosition } from "@anori/utils/grid/types";
import {
  canPlaceItemInGrid,
  GRID_DRAG_EXTEND_SLOTS,
  positionToPixelPosition,
  snapPixelPositionToGrid,
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

type WidgetMove = { instanceId: string; position: GridPosition };
type DragPreview = { instanceId: string; position: GridPosition; displaced: WidgetMove[] };

const rectsOverlap = (
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number },
) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

type Rect = { x: number; y: number; width: number; height: number };

// Resolves where widgets overlapped by a drag/resize should go, trying three strategies from most
// polite to most forceful:
//   1. Block trade — the widgets under the target slide as one rigid block into the vacated space.
//   2. Corridor rotation (single-axis drags) — everything along the travel path shifts one step
//      toward the origin, list-reorder style.
//   3. Push sweep — everything overlapping the target is pushed straight down (or right, when a
//      resize grows the widget horizontally), and whatever they land on is pushed further the same
//      way, preserving the widgets' relative order and possibly growing the grid. Gaps left behind
//      are not backfilled.
// Works on a copy of the layout and returns the moves to preview/commit; null means it failed to
// settle and the gesture has no valid preview.
const computeDisplacedMoves = (
  gridDimensions: GridDimensions,
  layout: WidgetInFolderWithMeta[],
  item: WidgetInFolderWithMeta,
  position: GridPosition,
  pushDirection: "down" | "right" = "down",
): WidgetMove[] | null => {
  const rects = new Map<string, Rect>();
  for (const w of layout) {
    rects.set(w.instanceId, { x: w.x, y: w.y, width: w.width, height: w.height });
  }
  rects.set(item.instanceId, { x: position.x, y: position.y, width: item.width, height: item.height });

  // First preference: shift every overlapped widget as one block by the opposite of the drag vector,
  // into the space the dragged widget vacated — the whole group keeps its arrangement. Valid only when
  // each shifted widget stays in bounds and neither its destination nor its travel path crosses a
  // stationary widget (crossing the dragged widget or fellow group members is fine — they're trading
  // places). Falls back to per-widget escape/push resolution otherwise.
  const delta = { x: position.x - item.x, y: position.y - item.y };
  if (delta.x !== 0 || delta.y !== 0) {
    const target: Rect = { x: position.x, y: position.y, width: item.width, height: item.height };
    const group = layout.filter((w) => w.instanceId !== item.instanceId && rectsOverlap(w, target));
    if (group.length > 0) {
      const groupIds = new Set(group.map((w) => w.instanceId));
      const shiftValid = group.every((w) => {
        const nx = w.x - delta.x;
        const ny = w.y - delta.y;
        if (nx < 0 || ny < 0) return false;
        if (nx + w.width > gridDimensions.columns || ny + w.height > gridDimensions.rows) return false;
        const finalRect = { x: nx, y: ny, width: w.width, height: w.height };
        if (rectsOverlap(finalRect, target)) return false;
        const sweep = {
          x: Math.min(w.x, nx),
          y: Math.min(w.y, ny),
          width: w.width + Math.abs(delta.x),
          height: w.height + Math.abs(delta.y),
        };
        for (const other of layout) {
          if (other.instanceId === item.instanceId || groupIds.has(other.instanceId)) continue;
          if (rectsOverlap(finalRect, other) || rectsOverlap(sweep, other)) return false;
        }
        return true;
      });
      if (shiftValid) {
        return group.map((w) => ({
          instanceId: w.instanceId,
          position: { x: w.x - delta.x, y: w.y - delta.y },
        }));
      }
    }
  }

  // Second preference, for single-axis drags past intermediate widgets: rotate the corridor. Every
  // widget in the dragged widget's travel path shifts one step (the dragged widget's own size)
  // toward the vacated origin, list-reorder style — A over B and C ends as B, C, A rather than C
  // shoved aside and a hole left at A's origin. All-or-nothing like the block trade.
  if ((delta.x === 0) !== (delta.y === 0)) {
    const shift =
      delta.x === 0 ? { x: 0, y: -Math.sign(delta.y) * item.height } : { x: -Math.sign(delta.x) * item.width, y: 0 };
    const corridor: Rect = {
      x: Math.min(item.x, position.x),
      y: Math.min(item.y, position.y),
      width: item.width + Math.abs(delta.x),
      height: item.height + Math.abs(delta.y),
    };
    const target: Rect = { x: position.x, y: position.y, width: item.width, height: item.height };
    const members = layout.filter((w) => w.instanceId !== item.instanceId && rectsOverlap(w, corridor));
    if (members.length > 0) {
      const memberIds = new Set(members.map((w) => w.instanceId));
      const rotationValid = members.every((w) => {
        const nx = w.x + shift.x;
        const ny = w.y + shift.y;
        if (nx < 0 || ny < 0) return false;
        if (nx + w.width > gridDimensions.columns || ny + w.height > gridDimensions.rows) return false;
        const finalRect = { x: nx, y: ny, width: w.width, height: w.height };
        if (rectsOverlap(finalRect, target)) return false;
        const sweep = {
          x: Math.min(w.x, nx),
          y: Math.min(w.y, ny),
          width: w.width + Math.abs(shift.x),
          height: w.height + Math.abs(shift.y),
        };
        for (const other of layout) {
          if (other.instanceId === item.instanceId || memberIds.has(other.instanceId)) continue;
          if (rectsOverlap(finalRect, other) || rectsOverlap(sweep, other)) return false;
        }
        return true;
      });
      if (rotationValid) {
        return members.map((w) => ({
          instanceId: w.instanceId,
          position: { x: w.x + shift.x, y: w.y + shift.y },
        }));
      }
    }
  }

  // Widgets are processed in reading order along the push direction, each one settling below (or
  // right of) everything already settled that it overlaps — so a pushed widget pushes the ones
  // after it, and relative order along the axis is preserved.
  const targetRect: Rect = { x: position.x, y: position.y, width: item.width, height: item.height };
  const placed: Rect[] = [targetRect];
  const sorted = layout
    .filter((w) => w.instanceId !== item.instanceId)
    .sort((a, b) => (pushDirection === "right" ? a.x - b.x || a.y - b.y : a.y - b.y || a.x - b.x));
  for (const w of sorted) {
    const rect = rects.get(w.instanceId) as Rect;
    let guard = 0;
    let overlapping = true;
    while (overlapping) {
      if (++guard > 200) return null;
      overlapping = false;
      for (const p of placed) {
        if (rectsOverlap(rect, p)) {
          if (pushDirection === "right") rect.x = p.x + p.width;
          else rect.y = p.y + p.height;
          overlapping = true;
        }
      }
    }
    placed.push(rect);
  }

  const moves: WidgetMove[] = [];
  for (const w of layout) {
    if (w.instanceId === item.instanceId) continue;
    const rect = rects.get(w.instanceId) as Rect;
    if (rect.x !== w.x || rect.y !== w.y) {
      moves.push({ instanceId: w.instanceId, position: { x: rect.x, y: rect.y } });
    }
  }
  return moves;
};

const resizePushDirection = (oldSize: GridItemSize, newSize: GridItemSize): "down" | "right" =>
  newSize.width > oldSize.width && newSize.height <= oldSize.height ? "right" : "down";

const samePosition = (a: GridPosition, b: GridPosition) => a.x === b.x && a.y === b.y;
const samePreview = (a: DragPreview, b: DragPreview) =>
  a.instanceId === b.instanceId &&
  samePosition(a.position, b.position) &&
  a.displaced.length === b.displaced.length &&
  a.displaced.every(
    (m, i) => m.instanceId === b.displaced[i].instanceId && samePosition(m.position, b.displaced[i].position),
  );

const useDragSnapPosition = (
  gridDimensions: GridDimensions,
  layout: WidgetInFolderWithMeta[],
  onDrop: (moves: WidgetMove[]) => void,
) => {
  const { gridRef } = useParentFolder();
  const [snap, setSnap] = useState<DragPreview | null>(null);
  const snapRef = useMirrorStateToRef(snap);
  const dragStartRect = useRef<DOMRect | null>(null);

  useDragDropMonitor({
    onDragStart(event) {
      const { source } = event.operation;
      if (!source || source.type !== "widget") return;
      dragStartRect.current = gridRef.current?.getBoundingClientRect() ?? null;
    },
    onDragMove(event) {
      const { source, target } = event.operation;
      if (!source || source.type !== "widget") return;
      const item = layout.find((w) => w.instanceId === source.id);
      if (!item || !gridRef.current) return;

      if (target?.type === "folder") {
        setSnap(null);
        return;
      }

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
      const snapPosition = snapPixelPositionToGrid({
        grid: gridDimensions,
        position: virtualCorner,
        extend: GRID_DRAG_EXTEND_SLOTS,
      });
      const canPlace = canPlaceItemInGrid({
        grid: gridDimensions,
        item,
        layout: layout.filter((w) => w.instanceId !== item.instanceId),
        position: snapPosition,
        allowOutOfBounds: true,
      });
      let preview: DragPreview | null = null;
      if (canPlace) {
        preview = { instanceId: item.instanceId, position: snapPosition, displaced: [] };
      } else {
        const moves = computeDisplacedMoves(gridDimensions, layout, item, snapPosition);
        if (moves) preview = { instanceId: item.instanceId, position: snapPosition, displaced: moves };
      }

      setSnap((prev) => {
        if (prev === null && preview === null) return prev;
        if (prev && preview && samePreview(prev, preview)) return prev;
        return preview;
      });
    },
    onDragEnd(event) {
      const lastSnap = snapRef.current;
      setSnap(null);
      dragStartRect.current = null;
      if (event.canceled) return;
      const { source, target } = event.operation;
      if (!source || source.type !== "widget" || target?.type === "folder") return;
      if (lastSnap && lastSnap.instanceId === source.id) {
        onDrop([{ instanceId: lastSnap.instanceId, position: lastSnap.position }, ...lastSnap.displaced]);
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
