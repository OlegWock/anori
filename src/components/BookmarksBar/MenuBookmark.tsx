import { builtinIcons } from "@anori/design-system/components/Icon/builtin-icons";
import { Favicon } from "@anori/design-system/components/Icon/Favicon";
import { Icon } from "@anori/design-system/components/Icon/Icon";
import { Link } from "@anori/design-system/components/Link/Link";
import { useSizeSettings } from "@anori/utils/compact";
import { useDirection } from "@radix-ui/react-direction";
import * as Menubar from "@radix-ui/react-menubar";
import { memo } from "react";
import { css, cva } from "styled-system/css";
import { VirtualizedBookmarksMenuContent, zIndexFix } from "./BookmarksMenuContent";
import {
  useBookmarkDragSource,
  useBookmarkDropTarget,
  useDropPlacement,
  useMergedElementRefs,
  useSubmenuOpenState,
} from "./dnd";
import type { BookmarkType } from "./useBookmarks";

const rowShell = css({ position: "relative" });
const menuItem = cva({
  base: {
    padding: "2",
    borderRadius: "md",
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
    _hover: { background: "ghost.hover" },
    "&:focus-visible": { outline: "none", background: "ghost.hover" },
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
    dragging: { true: { boxShadow: "overlay" } },
    dropInto: { true: { background: "ghost.hover", boxShadow: "inset 0 0 0 2px token(colors.accent)" } },
  },
});
const dropLine = cva({
  base: {
    position: "absolute",
    insetInline: "1",
    height: "2px",
    borderRadius: "full",
    background: "accent",
    pointerEvents: "none",
    zIndex: 1,
  },
  variants: {
    side: {
      before: { top: "-1px" },
      after: { bottom: "-1px" },
    },
  },
});
const content = css({
  flexGrow: 1,
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-start",
  gap: "2",
  overflow: "hidden",
});
const title = css({ textOverflow: "ellipsis", overflow: "hidden", flexGrow: 1 });

export const MenuBookmark = memo(function MenuBookmark({
  bookmark: bm,
  shiftSubmenu,
}: {
  bookmark: BookmarkType;
  shiftSubmenu?: boolean;
}) {
  const { rem } = useSizeSettings();
  const dir = useDirection();
  const { ref: dragRef, isDragging } = useBookmarkDragSource(bm);
  const dropRef = useBookmarkDropTarget(bm, "menu");
  const placement = useDropPlacement(bm.id);
  const [submenuOpen, onSubmenuOpenChange] = useSubmenuOpenState(bm.id);
  const ref = useMergedElementRefs(dragRef, dropRef);
  const className = menuItem({ dragging: isDragging, dropInto: placement === "into" });
  const line = (placement === "before" || placement === "after") && <div className={dropLine({ side: placement })} />;

  if (bm.type === "bookmark") {
    return (
      <div className={rowShell}>
        <Menubar.Item asChild>
          <Link ref={ref} className={className} href={bm.url} draggable={false}>
            <div className={content}>
              <Favicon url={bm.url} useFaviconApiIfPossible height={rem(1)} width={rem(1)} />
              {!!bm.title && <span className={title}>{bm.title}</span>}
            </div>
          </Link>
        </Menubar.Item>
        {line}
      </div>
    );
  }
  return (
    <div className={rowShell}>
      <Menubar.Sub open={submenuOpen} onOpenChange={onSubmenuOpenChange}>
        <Menubar.SubTrigger ref={ref} className={className}>
          <div className={content}>
            <Icon icon={builtinIcons.folder} size="sm" />
            <span className={title}>{bm.title}</span>
          </div>

          <Icon size="sm" icon={dir === "ltr" ? builtinIcons.chevronForward : builtinIcons.chevronBack} />
        </Menubar.SubTrigger>
        <Menubar.Portal>
          <div className={zIndexFix}>
            <VirtualizedBookmarksMenuContent bookmarks={bm.items} isSubmenu shiftSubmenu={shiftSubmenu} />
          </div>
        </Menubar.Portal>
      </Menubar.Sub>
      {line}
    </div>
  );
});
