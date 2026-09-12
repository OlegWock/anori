import { isChromeLike } from "@anori/utils/browser";
import { useMirrorStateToRef } from "@anori/utils/hooks";
import { type CollisionDetector, CollisionPriority, CollisionType } from "@dnd-kit/abstract";
import { Feedback } from "@dnd-kit/dom";
import { useDragDropMonitor, useDraggable, useDroppable } from "@dnd-kit/react";
import { atom, getDefaultStore, useAtomValue } from "jotai";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { flushSync } from "react-dom";
import browser from "webextension-polyfill";
import type { BookmarksById, BookmarkType } from "./useBookmarks";

export type DropPlacement = "before" | "after" | "into";
export type DropZone = "bar" | "menu";
type DropTarget = { id: string; placement: DropPlacement };
type BookmarkDragData = { node: BookmarkType };
type BookmarkDropData = { node: BookmarkType; zone: DropZone; root: boolean };
type Rect = { top: number; left: number; width: number; height: number };
type Point = { x: number; y: number };

const BOOKMARK_DRAG_TYPE = "bookmark";
const BOOKMARK_DROP_TYPE = "bookmark-target";
const SPRING_LOAD_DELAY_MS = 500;
const FOLDER_EDGE_FRACTION = 0.25;
const MENU_ROW_PRIORITY_BASE = 10;

const store = getDefaultStore();
const dragActiveAtom = atom(false);
const dropTargetAtom = atom<DropTarget | null>(null);
const openMenuAtom = atom("");
const openSubmenusAtom = atom<ReadonlySet<string>>(new Set<string>());

const pointerWithin: CollisionDetector = ({ droppable, dragOperation }) => {
  const shape = droppable.shape;
  if (!shape?.containsPoint(dragOperation.position.current)) return null;
  return {
    id: droppable.id,
    priority: CollisionPriority.Normal,
    type: CollisionType.PointerIntersection,
    value: 1,
  };
};

const isSelfOrDescendant = (candidate: BookmarkType, folderId: string) =>
  candidate.id === folderId || candidate.path.includes(folderId);

const computePlacement = (
  source: BookmarkType,
  target: BookmarkDropData,
  rect: Rect,
  point: Point,
  isRtl: boolean,
): DropPlacement | null => {
  const { node, zone, root } = target;
  if (isSelfOrDescendant(node, source.id)) return null;
  if (root) return "into";

  const fraction = zone === "bar" ? (point.x - rect.left) / rect.width : (point.y - rect.top) / rect.height;
  const fromStart = zone === "bar" && isRtl ? 1 - fraction : fraction;
  if (node.type === "folder") {
    if (fromStart < FOLDER_EDGE_FRACTION) return "before";
    if (fromStart > 1 - FOLDER_EDGE_FRACTION) return "after";
    return "into";
  }
  return fromStart < 0.5 ? "before" : "after";
};

type Destination = { parentId: string; finalIndex?: number; apiIndex?: number };

const resolveDestination = (source: BookmarkType, target: BookmarkType, placement: DropPlacement): Destination => {
  if (placement === "into") return { parentId: target.id };

  const insertBefore = placement === "before" ? target.index : target.index + 1;
  const sameParent = source.parentId === target.parentId;
  const finalIndex = sameParent && source.index < insertBefore ? insertBefore - 1 : insertBefore;
  const apiIndex = isChromeLike(browser) && sameParent && finalIndex > source.index ? finalIndex + 1 : finalIndex;
  return { parentId: target.parentId, finalIndex, apiIndex };
};

const openFolderChain = (chain: string[]) => {
  store.set(openMenuAtom, chain[0] ?? "");
  store.set(openSubmenusAtom, new Set(chain.slice(1)));
};

export const preventDismissDuringDrag = (event: Event) => {
  if (store.get(dragActiveAtom)) event.preventDefault();
};

export const useBookmarksBarDnd = ({
  bookmarksById,
  isRtl,
  moveBookmarkLocally,
  reload,
}: {
  bookmarksById: BookmarksById;
  isRtl: boolean;
  moveBookmarkLocally: (sourceId: string, parentId: string, index?: number) => void;
  reload: () => void;
}) => {
  const bookmarksByIdRef = useMirrorStateToRef(bookmarksById);
  const isRtlRef = useMirrorStateToRef(isRtl);
  const moveBookmarkLocallyRef = useMirrorStateToRef(moveBookmarkLocally);
  const reloadRef = useMirrorStateToRef(reload);
  const springLoadRef = useRef<{ key: string; timeout: number } | null>(null);

  const clearSpringLoad = useCallback(() => {
    if (!springLoadRef.current) return;
    clearTimeout(springLoadRef.current.timeout);
    springLoadRef.current = null;
  }, []);

  const scheduleSpringLoad = useCallback(
    (key: string, action: () => void) => {
      if (springLoadRef.current?.key === key) return;
      clearSpringLoad();
      const timeout = window.setTimeout(() => {
        springLoadRef.current = null;
        action();
      }, SPRING_LOAD_DELAY_MS);
      springLoadRef.current = { key, timeout };
    },
    [clearSpringLoad],
  );

  const updateDropTarget = useCallback(
    (sourceNode: BookmarkType, targetData: BookmarkDropData | undefined, rect: Rect | undefined, point: Point) => {
      const placement =
        targetData && rect ? computePlacement(sourceNode, targetData, rect, point, isRtlRef.current) : null;
      if (!placement || !targetData) {
        store.set(dropTargetAtom, null);
        clearSpringLoad();
        return;
      }
      store.set(dropTargetAtom, { id: targetData.node.id, placement });
      const chain =
        placement === "into" && targetData.node.type === "folder"
          ? [...targetData.node.path, targetData.node.id]
          : targetData.node.path;
      scheduleSpringLoad(`${targetData.node.id}:${placement === "into"}`, () => openFolderChain(chain));
    },
    [clearSpringLoad, scheduleSpringLoad],
  );

  const finishDrag = useCallback(() => {
    clearSpringLoad();
    store.set(dragActiveAtom, false);
    store.set(dropTargetAtom, null);
    openFolderChain([]);
  }, [clearSpringLoad]);

  useDragDropMonitor({
    onDragStart(event, manager) {
      const { source } = event.operation;
      const isBookmark = source?.type === BOOKMARK_DRAG_TYPE;
      const feedback = manager.plugins.find((plugin) => plugin instanceof Feedback);
      if (feedback) feedback.dropAnimation = isBookmark ? null : undefined;
      if (!isBookmark) return;
      store.set(dragActiveAtom, true);
      const sourceNode = (source.data as BookmarkDragData | undefined)?.node;
      if (sourceNode && sourceNode.path.length === 0) openFolderChain([]);
    },
    onDragOver(event) {
      const { source, target, position } = event.operation;
      if (source?.type !== BOOKMARK_DRAG_TYPE) return;
      const sourceNode = (source.data as BookmarkDragData | undefined)?.node;
      if (!sourceNode) return;
      updateDropTarget(
        sourceNode,
        target?.data as BookmarkDropData | undefined,
        target?.shape?.boundingRectangle,
        position.current,
      );
    },
    onDragMove(event) {
      const { source, target, position } = event.operation;
      if (source?.type !== BOOKMARK_DRAG_TYPE) return;
      const sourceNode = (source.data as BookmarkDragData | undefined)?.node;
      if (!sourceNode) return;
      updateDropTarget(
        sourceNode,
        target?.data as BookmarkDropData | undefined,
        target?.shape?.boundingRectangle,
        position.current,
      );
    },
    onDragEnd(event) {
      const { source } = event.operation;
      if (source?.type !== BOOKMARK_DRAG_TYPE) return;
      const sourceNode = (source.data as BookmarkDragData | undefined)?.node;
      const dropTarget = store.get(dropTargetAtom);
      finishDrag();
      if (event.canceled || !sourceNode || !dropTarget) return;
      const targetNode = bookmarksByIdRef.current.get(dropTarget.id);
      if (!targetNode) return;
      const { parentId, finalIndex, apiIndex } = resolveDestination(sourceNode, targetNode, dropTarget.placement);
      flushSync(() => moveBookmarkLocallyRef.current(sourceNode.id, parentId, finalIndex));
      browser.bookmarks
        .move(sourceNode.id, apiIndex === undefined ? { parentId } : { parentId, index: apiIndex })
        .catch((err) => {
          console.log("Error while moving bookmark", err);
          reloadRef.current();
        });
    },
  });

  useEffect(() => clearSpringLoad, [clearSpringLoad]);

  const menubarValue = useAtomValue(openMenuAtom);
  const onMenubarValueChange = useCallback((value: string) => {
    if (store.get(dragActiveAtom)) return;
    openFolderChain(value ? [value] : []);
  }, []);

  return { menubarValue, onMenubarValueChange };
};

export const useSubmenuOpenState = (id: string) => {
  const open = useAtomValue(useMemo(() => atom((get) => get(openSubmenusAtom).has(id)), [id]));
  const onOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (store.get(dragActiveAtom)) return;
      const current = store.get(openSubmenusAtom);
      if (current.has(id) === nextOpen) return;
      const next = new Set(current);
      if (nextOpen) next.add(id);
      else next.delete(id);
      store.set(openSubmenusAtom, next);
    },
    [id],
  );
  return [open, onOpenChange] as const;
};

export const useDropPlacement = (id: string): DropPlacement | null =>
  useAtomValue(
    useMemo(
      () =>
        atom((get) => {
          const target = get(dropTargetAtom);
          return target?.id === id ? target.placement : null;
        }),
      [id],
    ),
  );

export const useBookmarkDragSource = (node: BookmarkType, { disabled = false }: { disabled?: boolean } = {}) => {
  const data: BookmarkDragData = { node };
  const { ref, isDragging } = useDraggable({
    id: `bookmark-drag:${node.id}`,
    type: BOOKMARK_DRAG_TYPE,
    data,
    disabled,
  });
  return { ref, isDragging };
};

export const useBookmarkDropTarget = (
  node: BookmarkType,
  zone: DropZone,
  { root = false }: { root?: boolean } = {},
) => {
  const data: BookmarkDropData = { node, zone, root };
  const { ref } = useDroppable({
    id: `bookmark-drop:${node.id}`,
    type: BOOKMARK_DROP_TYPE,
    accept: BOOKMARK_DRAG_TYPE,
    collisionDetector: pointerWithin,
    collisionPriority: zone === "menu" ? MENU_ROW_PRIORITY_BASE + node.path.length : CollisionPriority.Normal,
    data,
  });
  return ref;
};

type ElementRef = (element: Element | null) => void;

export const useMergedElementRefs = (first: ElementRef, second: ElementRef) =>
  useCallback(
    (element: HTMLElement | null) => {
      first(element);
      second(element);
    },
    [first, second],
  );
