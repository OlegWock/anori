import { RequirePermissions } from "@anori/components/RequirePermissions";
import { ScrollArea } from "@anori/design-system/components/ScrollArea/ScrollArea";
import { useSizeSettings } from "@anori/utils/compact";
import { usePermissionsQuery } from "@anori/utils/permissions";
import { useDirection } from "@radix-ui/react-direction";
import * as Menubar from "@radix-ui/react-menubar";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useRef } from "react";
import { css, cva, cx } from "styled-system/css";
import { Bookmark } from "./Bookmark";
import { useBookmarks } from "./useBookmarks";

// The bookmarks read as frosted glass: translucent `frosted` fills over a backdrop blur (so DS-1's
// no-subtle-text rule applies — text stays primary).
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
    // Once permissions are granted the bar sits flush over the page (no frosted plate of its own).
    transparent: { true: { padding: 0, borderRadius: 0, background: "transparent", backdropFilter: "none" } },
  },
});

const bookmarks = css({ display: "flex", alignItems: "flex-start", gap: "4", flexGrow: 1, overflow: "hidden" });
const barWrapper = css({ flex: 1, overflow: "hidden", paddingBottom: "2" });
const barInner = css({ display: "flex", gap: "3", width: "fit-content" });
const barItem = css({ display: "flex", flexShrink: 0 });
const placeholder = css({ height: "2.08rem" });

const BookmarksBarComponent = () => {
  const [bar, other] = useBookmarks();
  const dir = useDirection();

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
    <Menubar.Root className={bookmarks} dir={dir}>
      {bar.length === 0 && !other && <div className={placeholder} />}

      <ScrollArea
        type="hover"
        direction="horizontal"
        size="thin"
        className={barWrapper}
        mirrorVerticalScrollToHorizontal
        viewportRef={scrollAreaRef}
      >
        <div style={{ width: virtualizer.getTotalSize() }}>
          <div className={barInner} style={{ transform: `translateX(${firstItemOffset}px)` }}>
            {virtualizedItems.map((virtualItem) => {
              const bm = bar[virtualItem.index];
              return (
                <div className={barItem} data-index={virtualItem.index} ref={virtualizer.measureElement} key={bm.id}>
                  <Bookmark bookmark={bm} />
                </div>
              );
            })}
          </div>
        </div>
      </ScrollArea>
      {!!other && <Bookmark bookmark={other} fullWidth />}
    </Menubar.Root>
  );
};

export const BookmarksBar = () => {
  const hasPermissions = usePermissionsQuery({ permissions: ["bookmarks", "favicon"] });
  return (
    <div className={cx(container({ transparent: hasPermissions }), "BookmarksBar")}>
      <RequirePermissions permissions={["bookmarks", "favicon"]} compact>
        <BookmarksBarComponent />
      </RequirePermissions>
    </div>
  );
};
