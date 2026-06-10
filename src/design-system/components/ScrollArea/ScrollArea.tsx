import { combineRefs } from "@anori/utils/react";
import { ScrollArea as Base } from "@base-ui/react/scroll-area";
import { useDirection } from "@radix-ui/react-direction";
import { m } from "framer-motion";
import { type ComponentProps, forwardRef, type ReactNode, type Ref, useEffect, useRef, type WheelEvent } from "react";
import { css, cva, cx } from "styled-system/css";

// `auto`/`always` keep the scrollbar visible whenever the content overflows; `hover`/`scroll` fade it in
// only while the pointer is over the area or while scrolling (Base UI exposes those as data attributes).
type ScrollAreaVisibility = "auto" | "always" | "hover" | "scroll";

type ScrollAreaProps = {
  children?: ReactNode;
  className?: string;
  contentClassName?: string;
  type?: ScrollAreaVisibility;
  direction?: "vertical" | "horizontal" | "both";
  mirrorVerticalScrollToHorizontal?: boolean;
  size?: "normal" | "thin";
  onVerticalOverflowStatusChange?: (overflows: boolean) => void;
  onHorizontalOverflowStatusChange?: (overflows: boolean) => void;
  viewportRef?: Ref<HTMLDivElement>;
  // Opt in to framer-motion layout projection through this scroll container — needed only when the
  // content has `layout`-animating children that must stay aligned while the area scrolls (the draggable
  // widget grid). It adds per-scroll projection work that makes the scrollbar thumb lag, so it's off by
  // default.
  layoutScroll?: boolean;
} & ComponentProps<typeof m.div>;

// Each part is styled directly and keeps its marker class (ScrollAreaRoot/Viewport/Content/Scrollbar/
// Thumb) — a public hook some widgets target from their own styles. `--scrollbar-size` is set on the
// root by the `size` variant and inherited by the rail/thumb.
const root = cva({
  base: {
    position: "relative",
    borderRadius: "xs",
    overflow: "hidden",
    backgroundColor: "transparent",
    display: "flex",
    flexDirection: "column",
  },
  variants: {
    size: { normal: { "--scrollbar-size": "10px" }, thin: { "--scrollbar-size": "7px" } },
    direction: { vertical: { overflowX: "hidden" }, horizontal: {}, both: {} },
  },
  defaultVariants: { size: "normal", direction: "vertical" },
});

const viewport = css({
  width: "100%",
  height: "100%",
  borderRadius: "inherit",
  flexShrink: 1,
  // Keep nested scrolling from chaining to the page.
  overscrollBehavior: "contain",
});

const content = css({ borderRadius: "inherit" });

const scrollbar = cva({
  base: {
    position: "absolute",
    display: "flex",
    userSelect: "none",
    touchAction: "none",
    padding: "0-5",
    borderRadius: "var(--scrollbar-size)",
    background: "transparent",
    transition: "opacity 160ms ease-out, background 160ms ease-out",
  },
  variants: {
    orientation: {
      vertical: {
        top: 0,
        right: 0,
        bottom: "var(--scroll-area-corner-height, 0px)",
        width: "var(--scrollbar-size)",
      },
      horizontal: {
        left: 0,
        bottom: 0,
        right: "var(--scroll-area-corner-width, 0px)",
        flexDirection: "column",
        height: "var(--scrollbar-size)",
      },
    },
    // Base UI only mounts the scrollbar when scrollable; `type` then drives its resting opacity.
    type: {
      auto: {},
      always: {},
      scroll: { opacity: 0, "&[data-scrolling]": { opacity: 1 } },
      hover: { opacity: 0, "&[data-hovering]": { opacity: 1 }, "&[data-scrolling]": { opacity: 1 } },
    },
  },
});

const thumb = cva({
  base: {
    background: "frosted",
    borderRadius: "var(--scrollbar-size)",
    position: "relative",
    // Larger touch target than the visible thumb (WCAG target size).
    "&::before": {
      content: '""',
      position: "absolute",
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
      width: "100%",
      height: "100%",
    },
  },
  variants: {
    orientation: {
      vertical: { width: "100%", height: "var(--scroll-area-thumb-height)", "&::before": { minHeight: "44px" } },
      horizontal: { height: "100%", width: "var(--scroll-area-thumb-width)", "&::before": { minWidth: "44px" } },
    },
  },
  defaultVariants: { orientation: "vertical" },
});

const corner = css({ background: "transparent" });

const checkVerticalOverflow = (el: Element) => el.clientHeight < el.scrollHeight;
const checkHorizontalOverflow = (el: Element) => el.clientWidth < el.scrollWidth;

export const ScrollArea = forwardRef<HTMLDivElement, ScrollAreaProps>(function ScrollArea(
  {
    children,
    className,
    contentClassName,
    type = "auto",
    direction = "vertical",
    onHorizontalOverflowStatusChange,
    onVerticalOverflowStatusChange,
    size = "normal",
    mirrorVerticalScrollToHorizontal = false,
    viewportRef,
    layoutScroll = false,
    ...props
  },
  ref,
) {
  const localViewportRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const mergedViewportRef = combineRefs(localViewportRef, viewportRef);
  const horizontalOverflowRef = useRef(false);
  const verticalOverflowRef = useRef(false);
  const dir = useDirection();

  const showVertical = direction === "vertical" || direction === "both";
  const showHorizontal = direction === "horizontal" || direction === "both";

  const mirrorScroll = (e: WheelEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (e.deltaY) e.currentTarget.scrollLeft += e.deltaY;
  };

  useEffect(() => {
    if (!onHorizontalOverflowStatusChange && !onVerticalOverflowStatusChange) return;
    const vp = localViewportRef.current;
    const node = contentRef.current;
    if (!vp || !node) return;

    const check = () => {
      const horizontal = checkHorizontalOverflow(vp);
      const vertical = checkVerticalOverflow(vp);
      if (horizontal !== horizontalOverflowRef.current) {
        horizontalOverflowRef.current = horizontal;
        onHorizontalOverflowStatusChange?.(horizontal);
      }
      if (vertical !== verticalOverflowRef.current) {
        verticalOverflowRef.current = vertical;
        onVerticalOverflowStatusChange?.(vertical);
      }
    };

    const observer = new ResizeObserver(check);
    observer.observe(vp);
    observer.observe(node);
    check();
    return () => observer.disconnect();
  }, [onHorizontalOverflowStatusChange, onVerticalOverflowStatusChange]);

  return (
    <Base.Root
      ref={ref}
      className={cx(root({ size, direction }), "ScrollAreaRoot", className)}
      render={<m.div dir={dir} {...props} />}
    >
      <Base.Viewport
        ref={mergedViewportRef}
        className={cx(viewport, "ScrollAreaViewport", contentClassName)}
        onWheel={showHorizontal && mirrorVerticalScrollToHorizontal ? mirrorScroll : undefined}
        render={<m.div {...(layoutScroll ? { layoutScroll: true, layoutRoot: true } : {})} />}
      >
        <Base.Content ref={contentRef} className={cx(content, "ScrollAreaContent")}>
          {children}
        </Base.Content>
      </Base.Viewport>

      {showVertical && (
        <Base.Scrollbar
          orientation="vertical"
          className={cx(scrollbar({ orientation: "vertical", type }), "ScrollAreaScrollbar")}
        >
          <Base.Thumb className={cx(thumb({ orientation: "vertical" }), "ScrollAreaThumb")} />
        </Base.Scrollbar>
      )}
      {showHorizontal && (
        <Base.Scrollbar
          orientation="horizontal"
          className={cx(scrollbar({ orientation: "horizontal", type }), "ScrollAreaScrollbar")}
        >
          <Base.Thumb className={cx(thumb({ orientation: "horizontal" }), "ScrollAreaThumb")} />
        </Base.Scrollbar>
      )}
      <Base.Corner className={cx(corner, "ScrollAreaCorner")} />
    </Base.Root>
  );
});

export const MotionScrollArea = m.create(ScrollArea);
