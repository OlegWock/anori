import { useParentFolder } from "@anori/utils/FolderContentContext";
import type { GridDimensions, GridPosition } from "@anori/utils/grid/types";
import {
  canPlaceItemInGrid,
  GRID_DRAG_EXTEND_SLOTS,
  positionToPixelPosition,
  snapPixelPositionToGrid,
} from "@anori/utils/grid/utils";
import { useMirrorStateToRef } from "@anori/utils/hooks";
import type { WidgetInFolderWithMeta } from "@anori/utils/user-data/types";
import { useDragDropMonitor } from "@dnd-kit/react";
import { useRef, useState } from "react";
import { computeDisplacedMoves, type WidgetMove } from "./displacement";

export type DragPreview = { instanceId: string; position: GridPosition; displaced: WidgetMove[] };

const samePosition = (a: GridPosition, b: GridPosition) => a.x === b.x && a.y === b.y;
const samePreview = (a: DragPreview, b: DragPreview) =>
  a.instanceId === b.instanceId &&
  samePosition(a.position, b.position) &&
  a.displaced.length === b.displaced.length &&
  a.displaced.every(
    (m, i) => m.instanceId === b.displaced[i].instanceId && samePosition(m.position, b.displaced[i].position),
  );

export const useDragSnapPosition = (
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
