import { builtinIcons } from "@anori/design-system/components/Icon/builtin-icons";
import { Favicon } from "@anori/design-system/components/Icon/Favicon";
import { Icon } from "@anori/design-system/components/Icon/Icon";
import { Link } from "@anori/design-system/components/Link/Link";
import { useSizeSettings } from "@anori/utils/compact";
import * as Menubar from "@radix-ui/react-menubar";
import { memo } from "react";
import { css, cva } from "styled-system/css";
import { VirtualizedBookmarksMenuContent, zIndexFix } from "./BookmarksMenuContent";
import { useBookmarkDragSource, useBookmarkDropTarget, useDropPlacement, useMergedElementRefs } from "./dnd";
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
    transitionProperty: "background-color, opacity",
    transitionDuration: "0.1s",
    transitionTimingFunction: "ease-in-out",
    lineHeight: "tight",
    fontSize: "sm",
    userSelect: "none",
    flexShrink: 0,
    _hover: { background: "ghost.hover" },
    _focus: { outline: "none" },
    _focusVisible: { boxShadow: "inset 0 0 0 2px token(colors.accent)" },
    "&[data-dnd-placeholder]": {
      visibility: "visible!",
      background: "transparent",
      boxShadow: "none",
      outline: "2px dashed token(colors.frosted.strong)",
      outlineOffset: "-2px",
    },
    "&[data-dnd-placeholder] > *": { visibility: "hidden" },
  },
  variants: {
    fullWidth: { true: { maxWidth: "unset" } },
    dragging: { true: { boxShadow: "overlay" } },
    dropInto: { true: { background: "ghost.hover", boxShadow: "inset 0 0 0 2px token(colors.accent)" } },
  },
});
const title = css({ textOverflow: "ellipsis", overflow: "hidden" });

export const Bookmark = memo(function Bookmark({
  bookmark: bm,
  fullWidth,
  isRoot = false,
}: {
  bookmark: BookmarkType;
  fullWidth?: boolean;
  isRoot?: boolean;
}) {
  const { rem } = useSizeSettings();
  const { ref: dragRef, isDragging } = useBookmarkDragSource(bm, { disabled: isRoot });
  const dropRef = useBookmarkDropTarget(bm, "bar", { root: isRoot });
  const placement = useDropPlacement(bm.id);
  const ref = useMergedElementRefs(dragRef, dropRef);
  const className = bookmark({ fullWidth, dragging: isDragging, dropInto: placement === "into" });

  const isBookmarksManager = bm.type === "bookmark" && bm.url.startsWith("chrome://bookmarks");

  const content = (
    <>
      {bm.type === "bookmark" &&
        (isBookmarksManager ? (
          <Icon color="icon.strong" icon={builtinIcons.bookmarksManager} height={rem(1)} width={rem(1)} />
        ) : (
          <Favicon url={bm.url} useFaviconApiIfPossible height={rem(1)} width={rem(1)} />
        ))}
      {bm.type === "folder" && <Icon color="icon.strong" icon={builtinIcons.folder} height={rem(1)} width={rem(1)} />}
      {!!bm.title && <span className={title}>{bm.title}</span>}
    </>
  );

  if (bm.type === "bookmark") {
    return (
      <Link ref={ref} className={className} href={bm.url} draggable={false}>
        {content}
      </Link>
    );
  }

  return (
    <Menubar.Menu value={bm.id}>
      <Menubar.Trigger ref={ref} className={className}>
        {content}
      </Menubar.Trigger>
      <Menubar.Portal>
        <div className={zIndexFix} onWheel={(e) => e.stopPropagation()}>
          <VirtualizedBookmarksMenuContent bookmarks={bm.items} />
        </div>
      </Menubar.Portal>
    </Menubar.Menu>
  );
});
