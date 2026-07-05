import { ScrollArea } from "@anori/design-system/components/ScrollArea/ScrollArea";
import { useSizeSettings } from "@anori/utils/compact";
import { useDirection } from "@radix-ui/react-direction";
import * as Menubar from "@radix-ui/react-menubar";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useRef, useState } from "react";
import { css, cva } from "styled-system/css";
import { MenuBookmark } from "./MenuBookmark";
import type { BookmarkType } from "./useBookmarks";

// Raises radix's portal wrapper above the bar (it would otherwise render under it). Shared by the
// bar-level dropdown and nested submenus.
export const zIndexFix = css({ "& > [data-radix-popper-content-wrapper]": { zIndex: "2!" } });

const menuContent = cva({
  base: {
    minWidth: "10rem",
    maxWidth: "25rem",
    maxHeight: "80vh",
    overflowY: "auto",
    background: "frosted",
    backdropFilter: "blur(25px)",
    borderRadius: "md",
    padding: "2",
    boxShadow: "popover",
    display: "flex",
    flexDirection: "column",
    "& a": { textDecoration: "none" },
  },
  variants: {
    // Nudge a submenu away from the scrollbar when the parent list overflows.
    shift: {
      right: { '&[data-side="right"]': { marginLeft: "12px" } },
      left: { '&[data-side="left"]': { marginRight: "12px" } },
    },
  },
});

export const VirtualizedBookmarksMenuContent = ({
  bookmarks: items,
  isSubmenu = false,
  shiftSubmenu = false,
}: {
  bookmarks: BookmarkType[];
  isSubmenu?: boolean;
  shiftSubmenu?: boolean;
}) => {
  const { rem } = useSizeSettings();
  const dir = useDirection();
  const [scrollAreaOverflows, setScrollAreaOverflows] = useState(false);

  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => scrollAreaRef.current,
    estimateSize: () => rem(2.05),
  });

  const virtualizedItems = virtualizer.getVirtualItems();
  const firstItemOffset = virtualizedItems[0]?.start ?? 0;

  const shift = isSubmenu && shiftSubmenu ? (dir === "ltr" ? "right" : "left") : undefined;

  const content = (
    <ScrollArea
      onVerticalOverflowStatusChange={setScrollAreaOverflows}
      size="thin"
      reserveScrollbarGutter
      viewportRef={scrollAreaRef}
    >
      <div style={{ height: virtualizer.getTotalSize() }}>
        <div style={{ transform: `translateY(${firstItemOffset}px)` }}>
          {virtualizedItems.map((virtualItem) => {
            const bm = items[virtualItem.index];
            return <MenuBookmark shiftSubmenu={scrollAreaOverflows} bookmark={bm} key={bm.id} />;
          })}
        </div>
      </div>
    </ScrollArea>
  );

  return isSubmenu ? (
    // Negative alignOffset cancels the panel's own top padding so the first item lines up with the hovered row.
    <Menubar.SubContent
      className={menuContent({ shift })}
      alignOffset={rem(-0.5)}
      sideOffset={rem(0.75)}
      collisionPadding={10}
    >
      {content}
    </Menubar.SubContent>
  ) : (
    <Menubar.Content
      className={menuContent({ shift })}
      align="start"
      sideOffset={5}
      alignOffset={-3}
      collisionPadding={10}
    >
      {content}
    </Menubar.Content>
  );
};
