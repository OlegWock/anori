import { builtinIcons } from "@anori/design-system/components/Icon/builtin-icons";
import { Favicon } from "@anori/design-system/components/Icon/Favicon";
import { Icon } from "@anori/design-system/components/Icon/Icon";
import { Link } from "@anori/design-system/components/Link/Link";
import { useSizeSettings } from "@anori/utils/compact";
import * as Menubar from "@radix-ui/react-menubar";
import { memo } from "react";
import { css, cva } from "styled-system/css";
import { VirtualizedBookmarksMenuContent, zIndexFix } from "./BookmarksMenuContent";
import type { BookmarkType } from "./useBookmarks";

const bookmark = cva({
  base: {
    padding: "2",
    borderRadius: "md",
    background: "frosted.subtle",
    backdropFilter: "blur(10px)",
    maxWidth: "9rem",
    whiteSpace: "nowrap",
    overflow: "hidden",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-start",
    gap: "2",
    textDecoration: "none",
    transitionProperty: "background-color",
    transitionDuration: "0.1s",
    transitionTimingFunction: "ease-in-out",
    lineHeight: "tight",
    fontSize: "sm",
    userSelect: "none",
    flexShrink: 0,
    _hover: { background: "frosted" },
  },
  variants: {
    fullWidth: { true: { maxWidth: "unset" } },
  },
});
const title = css({ textOverflow: "ellipsis", overflow: "hidden" });

export const Bookmark = memo(function Bookmark({
  bookmark: bm,
  fullWidth,
}: {
  bookmark: BookmarkType;
  fullWidth?: boolean;
}) {
  const { rem } = useSizeSettings();

  const content = (
    <>
      {bm.type === "bookmark" && <Favicon url={bm.url} useFaviconApiIfPossible height={rem(1)} width={rem(1)} />}
      {bm.type === "folder" && <Icon color="text.subtle" icon={builtinIcons.folder} height={rem(1)} width={rem(1)} />}
      {!!bm.title && <span className={title}>{bm.title}</span>}
    </>
  );

  if (bm.type === "bookmark") {
    return (
      <Link className={bookmark()} href={bm.url}>
        {content}
      </Link>
    );
  }

  return (
    <Menubar.Menu>
      <Menubar.Trigger className={bookmark({ fullWidth })}>{content}</Menubar.Trigger>
      <Menubar.Portal>
        <div className={zIndexFix} onWheel={(e) => e.stopPropagation()}>
          <VirtualizedBookmarksMenuContent bookmarks={bm.items} />
        </div>
      </Menubar.Portal>
    </Menubar.Menu>
  );
});
