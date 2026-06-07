import { useCallback, useEffect, useState } from "react";
import browser from "webextension-polyfill";

export type BookmarkItem = {
  id: string;
  type: "bookmark";
  url: string;
  title: string;
};

export type BookmarkFolder = {
  id: string;
  type: "folder";
  title: string;
  items: BookmarkType[];
};

export type BookmarkType = BookmarkItem | BookmarkFolder;

const transformBrowserBookmarkItem = (item: browser.Bookmarks.BookmarkTreeNode): BookmarkType => {
  if (item.url) {
    return {
      type: "bookmark",
      id: item.id,
      url: item.url,
      title: item.title,
    };
  }
  return {
    type: "folder",
    id: item.id,
    title: item.title,
    items: item.children?.map((i) => transformBrowserBookmarkItem(i)) ?? [],
  };
};

export const useBookmarks = () => {
  const loadBookmarks = useCallback(async () => {
    const tree = await browser.bookmarks.getTree();
    const nextChildren = tree[0].children;
    if (!nextChildren) {
      return [];
    }

    const [bmBar, bmOther] = nextChildren;
    const parsedBar = bmBar.children?.map((b) => transformBrowserBookmarkItem(b)) ?? [];
    const parsedOther = transformBrowserBookmarkItem(bmOther) as BookmarkFolder;
    setBookmarksBar(parsedBar);
    setOtherBookmarks(parsedOther);
  }, []);

  const [bookmarksBar, setBookmarksBar] = useState<BookmarkType[]>([]);
  const [otherBookmarks, setOtherBookmarks] = useState<BookmarkFolder | null>(null);

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

  return [bookmarksBar, otherBookmarks] as const;
};
