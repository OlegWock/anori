import { RequirePermissions } from "@anori/design-system/components/RequirePermissions/RequirePermissions";
import { ScrollArea } from "@anori/design-system/components/ScrollArea/ScrollArea";
import { useSizeSettings } from "@anori/utils/compact";
import { useWidgetDragActive } from "@anori/utils/dnd";
import { usePermissionsQuery } from "@anori/utils/permissions";
import { useDirection } from "@radix-ui/react-direction";
import * as Menubar from "@radix-ui/react-menubar";
import { useVirtualizer } from "@tanstack/react-virtual";
import { memo, useRef } from "react";
import { css, cva, cx } from "styled-system/css";
import { Bookmark } from "./Bookmark";
import { useBookmarksBarDnd, useDropPlacement } from "./dnd";
import { type BookmarkType, useBookmarks } from "./useBookmarks";

const container = cva({
  base: {
    borderRadius: "lg",
    background: "frosted.subtle",
    backdropFilter: "blur(10px)",
    zIndex: 1,
    overflow: "hidden",
    margin: "8",
    marginTop: "4",
    marginBottom: 0,
    padding: "2",
    display: "flex",
    alignItems: "center",
    minHeight: "calc(0.9rem * 1.2 + 1.55rem)",
  },
  variants: {
    transparent: { true: { padding: 0, borderRadius: 0, background: "transparent", backdropFilter: "none" } },
  },
});

const bookmarks = css({ display: "flex", alignItems: "flex-start", gap: "4", flexGrow: 1, overflow: "hidden" });
const barWrapper = css({ flex: 1, overflow: "hidden", paddingBottom: "2" });
const lockedViewport = css({ overflowX: "hidden!" });
const barInner = css({ display: "flex", gap: "3", width: "fit-content" });
const barItem = css({ display: "flex", flexShrink: 0, position: "relative" });
const dropLine = cva({
  base: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: "4px",
    borderRadius: "full",
    background: "accent",
    pointerEvents: "none",
  },
  variants: {
    side: {
      before: { insetInlineStart: "calc(-1 * token(spacing.3) / 2 - 1px)" },
      after: { insetInlineEnd: "calc(-1 * token(spacing.3) / 2 - 1px)" },
    },
  },
});
const placeholder = css({ height: "2.08rem" });

const BarItem = memo(function BarItem({
  bookmark,
  index,
  measureRef,
}: {
  bookmark: BookmarkType;
  index: number;
  measureRef: (element: HTMLDivElement | null) => void;
}) {
  const placement = useDropPlacement(bookmark.id);
  return (
    <div className={barItem} data-index={index} ref={measureRef}>
      <Bookmark bookmark={bookmark} />
      {(placement === "before" || placement === "after") && <div className={dropLine({ side: placement })} />}
    </div>
  );
});

const BookmarksBarComponent = memo(function BookmarksBarComponent() {
  const { bar, other, byId, moveBookmarkLocally, reload } = useBookmarks();
  const dir = useDirection();
  const { menubarValue, onMenubarValueChange } = useBookmarksBarDnd({
    bookmarksById: byId,
    isRtl: dir === "rtl",
    moveBookmarkLocally,
    reload,
  });

  const widgetDragActive = useWidgetDragActive();
  const { rem } = useSizeSettings();
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: bar.length,
    horizontal: true,
    getScrollElement: () => scrollAreaRef.current,
    estimateSize: () => rem(6),
    gap: rem(0.75),
    overscan: 5,
  });

  const virtualizedItems = virtualizer.getVirtualItems();
  const firstItemOffset = virtualizedItems[0]?.start ?? 0;

  return (
    <Menubar.Root className={bookmarks} dir={dir} value={menubarValue} onValueChange={onMenubarValueChange}>
      {bar.length === 0 && !other && <div className={placeholder} />}

      <ScrollArea
        type="hover"
        direction="horizontal"
        size="thin"
        className={barWrapper}
        viewportClassName={widgetDragActive ? lockedViewport : undefined}
        mirrorVerticalScrollToHorizontal
        viewportRef={scrollAreaRef}
      >
        <div style={{ width: virtualizer.getTotalSize() }}>
          <div className={barInner} style={{ transform: `translateX(${firstItemOffset}px)` }}>
            {virtualizedItems.map((virtualItem) => {
              const bm = bar[virtualItem.index];
              return (
                <BarItem key={bm.id} bookmark={bm} index={virtualItem.index} measureRef={virtualizer.measureElement} />
              );
            })}
          </div>
        </div>
      </ScrollArea>
      {!!other && <Bookmark bookmark={other} fullWidth isRoot />}
    </Menubar.Root>
  );
});

export const BookmarksBar = memo(function BookmarksBar() {
  const hasPermissions = usePermissionsQuery({ permissions: ["bookmarks", "favicon"] });
  return (
    <div className={cx(container({ transparent: hasPermissions }), "BookmarksBar")}>
      <RequirePermissions permissions={["bookmarks", "favicon"]} variant="compact">
        <BookmarksBarComponent />
      </RequirePermissions>
    </div>
  );
});
