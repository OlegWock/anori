import { Onboarding } from "@anori/components/Onboarding";
import { WidgetCard } from "@anori/components/WidgetCard/WidgetCard";
import { MotionScrollArea } from "@anori/design-system/components/ScrollArea/ScrollArea";
import { useParentFolder } from "@anori/utils/FolderContentContext";
import type { GridDimensions, GridItemSize, GridPosition } from "@anori/utils/grid/types";
import { canPlaceItemInGrid, positionToPixelPosition, snapPixelPositionToGrid } from "@anori/utils/grid/utils";
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

const GRID_DRAG_EXTEND_SLOTS = 2;

type WidgetMove = { instanceId: string; position: GridPosition };
type DragPreview = { instanceId: string; position: GridPosition; displaced: WidgetMove[] };

const rectsOverlap = (
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number },
) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

type Rect = { x: number; y: number; width: number; height: number };

// Mobile-launcher displacement: a widget overlapped by the dragged card relocates to the nearest
// completely free spot within the current grid — including the cell the dragged card just vacated.
// Only when no free spot fits it is it shoved down or right (whichever is the shorter shove), possibly
// pushing others transitively and growing the grid past its current bounds. Returns null only if the
// cascade fails to settle.
const computeDisplacedMoves = (
  gridDimensions: GridDimensions,
  layout: WidgetInFolderWithMeta[],
  item: WidgetInFolderWithMeta,
  position: GridPosition,
): WidgetMove[] | null => {
  const rects = new Map<string, Rect>();
  for (const w of layout) {
    rects.set(w.instanceId, { x: w.x, y: w.y, width: w.width, height: w.height });
  }
  rects.set(item.instanceId, { x: position.x, y: position.y, width: item.width, height: item.height });

  const overlapsAnythingAt = (candidate: Rect, exceptId: string) => {
    for (const [id, rect] of rects) {
      if (id !== exceptId && rectsOverlap(candidate, rect)) return true;
    }
    return false;
  };

  const isFreeSpot = (id: string, rect: Rect, c: GridPosition) => {
    if (c.x < 0 || c.y < 0) return false;
    if (c.x + rect.width > gridDimensions.columns || c.y + rect.height > gridDimensions.rows) return false;
    return !overlapsAnythingAt({ x: c.x, y: c.y, width: rect.width, height: rect.height }, id);
  };

  const nearest = (rect: Rect, list: GridPosition[]): { position: GridPosition; distance: number } | null => {
    let best: { position: GridPosition; distance: number } | null = null;
    for (const c of list) {
      const distance = Math.hypot(c.x - rect.x, c.y - rect.y);
      if (!best || distance < best.distance) best = { position: c, distance };
    }
    return best;
  };

  // A displaced widget escapes to a free spot beside the pusher, preferring the side it already sits
  // on (so a widget being squeezed rightward keeps sliding right while room remains) over other free
  // sides. The cell the dragged widget vacated is a fallback that competes with pushing by distance.
  const findAdjacentFreeSpot = (id: string, rect: Rect, pusher: Rect): GridPosition | null => {
    const widgetCx = rect.x + rect.width / 2;
    const widgetCy = rect.y + rect.height / 2;
    const pusherCx = pusher.x + pusher.width / 2;
    const pusherCy = pusher.y + pusher.height / 2;
    const directional = [
      { pos: { x: pusher.x + pusher.width, y: rect.y }, preferred: widgetCx >= pusherCx },
      { pos: { x: pusher.x - rect.width, y: rect.y }, preferred: widgetCx <= pusherCx },
      { pos: { x: rect.x, y: pusher.y + pusher.height }, preferred: widgetCy >= pusherCy },
      { pos: { x: rect.x, y: pusher.y - rect.height }, preferred: widgetCy <= pusherCy },
    ].filter((c) => isFreeSpot(id, rect, c.pos));
    const preferred = nearest(
      rect,
      directional.filter((c) => c.preferred).map((c) => c.pos),
    );
    if (preferred) return preferred.position;
    const other = nearest(
      rect,
      directional.filter((c) => !c.preferred).map((c) => c.pos),
    );
    return other ? other.position : null;
  };

  const queue = [item.instanceId];
  let guard = 0;
  while (queue.length > 0) {
    if (++guard > 200) return null;
    const pusherId = queue.shift() as string;
    const pusher = rects.get(pusherId) as Rect;
    const collided = [...rects.entries()]
      .filter(([id, rect]) => id !== pusherId && id !== item.instanceId && rectsOverlap(rect, pusher))
      .sort(([, a], [, b]) => b.y - a.y || b.x - a.x);

    for (const [id, rect] of collided) {
      if (!rectsOverlap(rect, pusher)) continue;

      const adjacentFree = findAdjacentFreeSpot(id, rect, pusher);
      if (adjacentFree) {
        rects.set(id, { ...rect, x: adjacentFree.x, y: adjacentFree.y });
        continue;
      }

      const down: Rect = { ...rect, y: pusher.y + pusher.height };
      const right: Rect = { ...rect, x: pusher.x + pusher.width };
      // A push may not eject a widget across the pusher to its far side: each direction is eligible
      // only when the widget's center is already on that side of the pusher's center. Neither side
      // (engulfed near the top-left corner) defaults to down.
      const downAllowed = rect.y + rect.height / 2 >= pusher.y + pusher.height / 2;
      const rightAllowed = rect.x + rect.width / 2 >= pusher.x + pusher.width / 2;
      let pushNext: Rect;
      if (downAllowed && rightAllowed) {
        pushNext = down.y - rect.y <= right.x - rect.x ? down : right;
      } else if (rightAllowed) {
        pushNext = right;
      } else {
        pushNext = down;
      }
      const pushDistance = Math.hypot(pushNext.x - rect.x, pushNext.y - rect.y);

      const origin: GridPosition = { x: item.x, y: item.y };
      if (isFreeSpot(id, rect, origin) && Math.hypot(origin.x - rect.x, origin.y - rect.y) <= pushDistance) {
        rects.set(id, { ...rect, x: origin.x, y: origin.y });
        continue;
      }
      rects.set(id, pushNext);
      queue.push(id);
    }
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

  const tryResizeWidget = (widget: WidgetInFolderWithMeta, widthInBoxes: number, heightInBoxes: number) => {
    if (widget.x + widthInBoxes > gridDimensions.columns) widthInBoxes = gridDimensions.columns - widget.x;
    if (widget.y + heightInBoxes > gridDimensions.rows) heightInBoxes = gridDimensions.rows - widget.y;

    if (widget.width === widthInBoxes && widget.height === heightInBoxes) {
      return false;
    }
    const moves = computeDisplacedMoves(
      gridDimensions,
      layout,
      { ...widget, width: widthInBoxes, height: heightInBoxes },
      { x: widget.x, y: widget.y },
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
    convertUnitsToPixels(Math.max(0, ...layout.map((w) => effectivePosition(w).x + effectiveSize(w).width))) +
    gapSize * 2;
  const maxHeightPx =
    convertUnitsToPixels(Math.max(0, ...layout.map((w) => effectivePosition(w).y + effectiveSize(w).height))) +
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
                  setResizePreview(previewSize ? { instanceId: w.instanceId, ...previewSize } : null)
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
