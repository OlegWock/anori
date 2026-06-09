import { Favicon } from "@anori/design-system/components/Icon/Favicon";
import { Input } from "@anori/design-system/components/Input/Input";
import type { PopoverRenderProps } from "@anori/design-system/components/Popover/Popover";
import { RequirePermissions } from "@anori/design-system/components/RequirePermissions/RequirePermissions";
import { ScrollArea } from "@anori/design-system/components/ScrollArea/ScrollArea";
import { useSizeSettings } from "@anori/utils/compact";
import { m } from "framer-motion";
import { useEffect, useState } from "react";
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
  "@media (any-hover: hover)": { "&:hover": { background: "frosted" } },
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
const noResults = css({ display: "flex", justifyContent: "center", alignItems: "center", padding: "16" });

type BrowserBookmark = {
  id: string;
  title: string;
  url: string;
  dateAdded: number;
};

type PickBookmarkProps = {
  onSelected: (title: string, url: string) => void;
};

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

  const filteredBookmarks = bookmarks.filter(({ title, url }) => {
    const q = searchQuery.toLowerCase();
    return title.toLowerCase().includes(q) || url.toLowerCase().includes(q);
  });

  return (
    <div className={pickBookmark}>
      <Input value={searchQuery} onValueChange={setSearchQuery} placeholder={t("bookmark-plugin.searchBookmarks")} />
      <ScrollArea>
        {filteredBookmarks.map((bk) => {
          return (
            <m.div
              key={bk.id}
              className={bookmark}
              onClick={() => {
                onSelected(bk.title, bk.url);
                close();
              }}
            >
              <Favicon url={bk.url} height={rem(1)} />
              <div className={bookmarkTitle}>{bk.title || bk.url}</div>
            </m.div>
          );
        })}
        {filteredBookmarks.length === 0 && <div className={noResults}>{t("noResults")}</div>}
      </ScrollArea>
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
