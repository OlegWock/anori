import type { GridDimensions, GridItemSize, GridPosition } from "@anori/utils/grid/types";
import type { WidgetInFolderWithMeta } from "@anori/utils/user-data/types";

export type WidgetMove = { instanceId: string; position: GridPosition };

type Rect = { x: number; y: number; width: number; height: number };

const rectsOverlap = (a: Rect, b: Rect) =>
  a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

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
export const computeDisplacedMoves = (
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

export const resizePushDirection = (oldSize: GridItemSize, newSize: GridItemSize): "down" | "right" =>
  newSize.width > oldSize.width && newSize.height <= oldSize.height ? "right" : "down";
