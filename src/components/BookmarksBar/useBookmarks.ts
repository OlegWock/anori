import { useCallback, useEffect, useState } from "react";
import browser from "webextension-polyfill";

type BookmarkNodeBase = {
  id: string;
  title: string;
  parentId: string;
  index: number;
  path: string[];
};

export type BookmarkItem = BookmarkNodeBase & {
  type: "bookmark";
  url: string;
};

export type BookmarkFolder = BookmarkNodeBase & {
  type: "folder";
  items: BookmarkType[];
};

export type BookmarkType = BookmarkItem | BookmarkFolder;
export type BookmarksById = ReadonlyMap<string, BookmarkType>;

const transformBrowserBookmarkItem = (
  item: browser.Bookmarks.BookmarkTreeNode,
  path: string[],
  byId: Map<string, BookmarkType>,
): BookmarkType => {
  const base: BookmarkNodeBase = {
    id: item.id,
    title: item.title,
    parentId: item.parentId ?? "",
    index: item.index ?? 0,
    path,
  };
  const node: BookmarkType = item.url
    ? { ...base, type: "bookmark", url: item.url }
    : {
        ...base,
        type: "folder",
        items: item.children?.map((child) => transformBrowserBookmarkItem(child, [...path, item.id], byId)) ?? [],
      };
  byId.set(node.id, node);
  return node;
};

type BookmarksState = {
  bar: BookmarkType[];
  other: BookmarkFolder | null;
  byId: BookmarksById;
  barId: string;
};

const EMPTY_STATE: BookmarksState = { bar: [], other: null, byId: new Map(), barId: "" };

const normalizeTree = (
  items: BookmarkType[],
  parentId: string,
  path: string[],
  byId: Map<string, BookmarkType>,
): BookmarkType[] =>
  items.map((item, index) => {
    const base: BookmarkNodeBase = { id: item.id, title: item.title, parentId, index, path };
    const node: BookmarkType =
      item.type === "folder"
        ? { ...base, type: "folder", items: normalizeTree(item.items, item.id, [...path, item.id], byId) }
        : { ...base, type: "bookmark", url: item.url };
    byId.set(node.id, node);
    return node;
  });

const detachNode = (items: BookmarkType[], id: string): [BookmarkType[], BookmarkType | null] => {
  let detached: BookmarkType | null = null;
  const remaining = items.flatMap((item): BookmarkType[] => {
    if (item.id === id) {
      detached = item;
      return [];
    }
    if (item.type === "folder") {
      const [children, found] = detachNode(item.items, id);
      if (found) {
        detached = found;
        return [{ ...item, items: children }];
      }
    }
    return [item];
  });
  return [remaining, detached];
};

const insertAt = (items: BookmarkType[], node: BookmarkType, index?: number): BookmarkType[] =>
  index === undefined ? [...items, node] : [...items.slice(0, index), node, ...items.slice(index)];

const insertIntoFolder = (
  items: BookmarkType[],
  parentId: string,
  node: BookmarkType,
  index?: number,
): BookmarkType[] =>
  items.map((item) => {
    if (item.type !== "folder") return item;
    if (item.id === parentId) return { ...item, items: insertAt(item.items, node, index) };
    return { ...item, items: insertIntoFolder(item.items, parentId, node, index) };
  });

const moveInTree = (state: BookmarksState, sourceId: string, parentId: string, index?: number): BookmarksState => {
  const [barWithout, fromBar] = detachNode(state.bar, sourceId);
  const [otherWithout, fromOther] = state.other ? detachNode([state.other], sourceId) : [[], null];
  const node = fromBar ?? fromOther;
  if (!node) return state;

  const bar =
    parentId === state.barId ? insertAt(barWithout, node, index) : insertIntoFolder(barWithout, parentId, node, index);
  const otherRoot = insertIntoFolder(otherWithout, parentId, node, index)[0];

  const byId = new Map<string, BookmarkType>();
  const normalizedBar = normalizeTree(bar, state.barId, [], byId);
  let other: BookmarkFolder | null = null;
  if (otherRoot && otherRoot.type === "folder") {
    other = { ...otherRoot, items: normalizeTree(otherRoot.items, otherRoot.id, [otherRoot.id], byId) };
    byId.set(other.id, other);
  }
  return { bar: normalizedBar, other, byId, barId: state.barId };
};

export const useBookmarks = () => {
  const [state, setState] = useState<BookmarksState>(EMPTY_STATE);

  const loadBookmarks = useCallback(async () => {
    const tree = await browser.bookmarks.getTree();
    const nextChildren = tree[0].children;
    if (!nextChildren) return;

    const [bmBar, bmOther] = nextChildren;
    const byId = new Map<string, BookmarkType>();
    const bar = bmBar.children?.map((b) => transformBrowserBookmarkItem(b, [], byId)) ?? [];
    const other = transformBrowserBookmarkItem(bmOther, [], byId) as BookmarkFolder;
    setState({ bar, other, byId, barId: bmBar.id });
  }, []);

  const moveBookmarkLocally = useCallback((sourceId: string, parentId: string, index?: number) => {
    setState((prev) => moveInTree(prev, sourceId, parentId, index));
  }, []);

  useEffect(() => {
    const handler = () => loadBookmarks();

    browser.bookmarks.onChanged.addListener(handler);
    // @ts-expect-error Chrome-only api
    if (browser.bookmarks.onChildrenReordered) browser.bookmarks.onChildrenReordered.addListener(handler);
    browser.bookmarks.onCreated.addListener(handler);
    browser.bookmarks.onMoved.addListener(handler);
    browser.bookmarks.onRemoved.addListener(handler);

    loadBookmarks();

    return () => {
      browser.bookmarks.onChanged.removeListener(handler);
      // @ts-expect-error Chrome-only api
      if (browser.bookmarks.onChildrenReordered) browser.bookmarks.onChildrenReordered.removeListener(handler);
      browser.bookmarks.onCreated.removeListener(handler);
      browser.bookmarks.onMoved.removeListener(handler);
      browser.bookmarks.onRemoved.removeListener(handler);
    };
  }, [loadBookmarks]);

  return { ...state, moveBookmarkLocally, reload: loadBookmarks };
};
