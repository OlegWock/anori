import { EmptyState } from "@anori/design-system/components/EmptyState/EmptyState";
import { Favicon } from "@anori/design-system/components/Icon/Favicon";
import { Input } from "@anori/design-system/components/Input/Input";
import type { PopoverRenderProps } from "@anori/design-system/components/Popover/Popover";
import { RequirePermissions } from "@anori/design-system/components/RequirePermissions/RequirePermissions";
import { ScrollArea } from "@anori/design-system/components/ScrollArea/ScrollArea";
import { useSizeSettings } from "@anori/utils/compact";
import { m } from "motion/react";
import { memo, useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { css } from "styled-system/css";
import browser from "webextension-polyfill";

const pickBookmark = css({
  display: "flex",
  flexDirection: "column",
  gap: "2",
  width: "600px",
  maxHeight: "max(40vh, 600px)",
});
const bookmark = css({
  display: "flex",
  alignItems: "center",
  gap: "4",
  padding: "1-5",
  borderRadius: "md",
  cursor: "pointer",
  transition: "0.15s ease-in-out",
  "@media (any-hover: hover)": { "&:hover": { background: "ghost.hover" } },
  "& svg": { minWidth: "18px", maxWidth: "18px" },
});
const bookmarkTitle = css({
  flexGrow: 1,
  flexShrink: 1,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  fontSize: "sm",
});
type BrowserBookmark = {
  id: string;
  title: string;
  url: string;
  dateAdded: number;
};

type PickBookmarkProps = {
  onSelected: (title: string, url: string) => void;
};

type BookmarkListProps = {
  bookmarks: BrowserBookmark[];
  faviconSize: number;
  emptyLabel: string;
  onPick: (title: string, url: string) => void;
};

const BookmarkList = memo(({ bookmarks, faviconSize, emptyLabel, onPick }: BookmarkListProps) => {
  return (
    <ScrollArea>
      {bookmarks.map((bk) => (
        <m.div key={bk.id} className={bookmark} onClick={() => onPick(bk.title, bk.url)}>
          <Favicon url={bk.url} useFaviconApiIfPossible height={faviconSize} width={faviconSize} />
          <div className={bookmarkTitle}>{bk.title || bk.url}</div>
        </m.div>
      ))}
      {bookmarks.length === 0 && <EmptyState title={emptyLabel} />}
    </ScrollArea>
  );
});

const _PickBookmark = ({ data: { onSelected }, close }: PopoverRenderProps<PickBookmarkProps>) => {
  const [bookmarks, setBookmarks] = useState<BrowserBookmark[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const { t } = useTranslation();

  useEffect(() => {
    const walkNode = (node: browser.Bookmarks.BookmarkTreeNode): BrowserBookmark[] => {
      if (node.children) {
        const res = node.children.map((n) => walkNode(n));
        return res.flat();
      }
      return [
        {
          id: node.id,
          title: node.title,
          url: node.url ?? "",
          dateAdded: node.dateAdded || 0,
        },
      ];
    };

    const main = async () => {
      const nodes = await browser.bookmarks.getTree();
      const bookmarks = nodes.flatMap((n) => walkNode(n));
      setBookmarks(bookmarks);
    };

    main();
  }, []);

  const { rem } = useSizeSettings();

  const deferredQuery = useDeferredValue(searchQuery);
  const filteredBookmarks = useMemo(() => {
    const q = deferredQuery.toLowerCase();
    return bookmarks.filter(({ title, url }) => title.toLowerCase().includes(q) || url.toLowerCase().includes(q));
  }, [bookmarks, deferredQuery]);

  const onPick = useCallback(
    (title: string, url: string) => {
      onSelected(title, url);
      close();
    },
    [onSelected, close],
  );

  return (
    <div className={pickBookmark}>
      <Input value={searchQuery} onValueChange={setSearchQuery} placeholder={t("bookmark-plugin.searchBookmarks")} />
      <BookmarkList bookmarks={filteredBookmarks} faviconSize={rem(1)} emptyLabel={t("noResults")} onPick={onPick} />
    </div>
  );
};

export const PickBookmark = (props: PopoverRenderProps<PickBookmarkProps>) => {
  return (
    <RequirePermissions permissions={["bookmarks", "favicon"]}>
      <_PickBookmark {...props} />
    </RequirePermissions>
  );
};
