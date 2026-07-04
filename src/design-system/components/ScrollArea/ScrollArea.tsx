import { combineRefs } from "@anori/utils/react";
import { ScrollArea as Base } from "@base-ui/react/scroll-area";
import { useDirection } from "@radix-ui/react-direction";
import { m } from "motion/react";
import { type ComponentProps, type ReactNode, type Ref, useEffect, useRef, useState, type WheelEvent } from "react";
import { css, cva, cx } from "styled-system/css";

type ScrollAreaVisibility = "auto" | "always" | "hover" | "scroll";

type ScrollAreaProps = {
  children?: ReactNode;
  className?: string;
  viewportClassName?: string;
  contentClassName?: string;
  type?: ScrollAreaVisibility;
  reserveScrollbarGutter?: boolean;
  direction?: "vertical" | "horizontal" | "both";
  mirrorVerticalScrollToHorizontal?: boolean;
  size?: "normal" | "thin";
  fill?: boolean;
  onVerticalOverflowStatusChange?: (overflows: boolean) => void;
  onHorizontalOverflowStatusChange?: (overflows: boolean) => void;
  viewportRef?: Ref<HTMLDivElement>;
  // Opt in to framer-motion layout projection through this scroll container — needed only when the
  // content has `layout`-animating children that must stay aligned while the area scrolls. It adds
  // per-scroll projection work that could make the scrollbar thumb lag, so it's off by default.
  layoutScroll?: boolean;
} & ComponentProps<typeof m.div>;

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
    fill: { true: { flex: "1 1 0", minHeight: 0 }, false: {} },
    reserveGutter: {
      true: { "&[data-scrollbar-visible]": { paddingRight: "var(--scrollbar-size)" } },
      false: {},
    },
  },
  defaultVariants: { size: "normal", fill: false, reserveGutter: false },
});

const viewport = cva({
  base: {
    width: "100%",
    height: "100%",
    borderRadius: "inherit",
    flexShrink: 1,
    overscrollBehavior: "contain",
  },
  variants: {
    fill: { true: { display: "flex", flexDirection: "column" }, false: {} },
    // Base UI sets `overflow: scroll` inline; `!important` clips the off-axis so a single-axis area can't scroll both ways.
    direction: {
      vertical: { overflowX: "hidden!" },
      horizontal: { overflowY: "hidden!" },
      both: {},
    },
  },
  defaultVariants: { fill: false, direction: "vertical" },
});

const content = cva({
  base: { borderRadius: "inherit" },
  variants: {
    fill: { true: { display: "flex", flexDirection: "column", flexGrow: 1 }, false: {} },
    // Base UI sets `min-width: fit-content` inline for horizontal sizing; clear it so vertical content wraps to the viewport.
    direction: {
      vertical: { minWidth: "0!" },
      horizontal: {},
      both: {},
    },
  },
  defaultVariants: { fill: false, direction: "vertical" },
});

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
    background: "scrollbar.thumb",
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

export const ScrollArea = ({
  children,
  className,
  viewportClassName,
  contentClassName,
  type = "auto",
  direction = "vertical",
  onHorizontalOverflowStatusChange,
  onVerticalOverflowStatusChange,
  size = "normal",
  fill = false,
  reserveScrollbarGutter = false,
  mirrorVerticalScrollToHorizontal = false,
  viewportRef,
  layoutScroll = false,
  ref,
  ...props
}: ScrollAreaProps) => {
  const localViewportRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const mergedViewportRef = combineRefs(localViewportRef, viewportRef);
  const horizontalOverflowRef = useRef(false);
  const verticalOverflowRef = useRef(false);
  const [gutterVisible, setGutterVisible] = useState(false);
  const dir = useDirection();

  const showVertical = direction === "vertical" || direction === "both";
  const showHorizontal = direction === "horizontal" || direction === "both";

  const mirrorScroll = (e: WheelEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (e.deltaY) e.currentTarget.scrollLeft += e.deltaY;
  };

  const trackOverflow = Boolean(
    onHorizontalOverflowStatusChange || onVerticalOverflowStatusChange || reserveScrollbarGutter,
  );

  useEffect(() => {
    if (!trackOverflow) return;
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
        setGutterVisible(vertical && showVertical);
      }
    };

    const observer = new ResizeObserver(check);
    observer.observe(vp);
    observer.observe(node);
    check();
    return () => observer.disconnect();
  }, [trackOverflow, onHorizontalOverflowStatusChange, onVerticalOverflowStatusChange, showVertical]);

  return (
    <Base.Root
      ref={ref}
      className={cx(root({ size, fill, reserveGutter: reserveScrollbarGutter }), className)}
      data-scrollbar-visible={reserveScrollbarGutter && gutterVisible ? "" : undefined}
      render={<m.div dir={dir} {...props} />}
    >
      <Base.Viewport
        ref={mergedViewportRef}
        className={cx(viewport({ fill, direction }), viewportClassName)}
        onWheel={showHorizontal && mirrorVerticalScrollToHorizontal ? mirrorScroll : undefined}
        render={<m.div {...(layoutScroll ? { layoutScroll: true, layoutRoot: true } : {})} />}
      >
        <Base.Content ref={contentRef} className={cx(content({ fill, direction }), contentClassName)}>
          {children}
        </Base.Content>
      </Base.Viewport>

      {showVertical && (
        <Base.Scrollbar orientation="vertical" className={scrollbar({ orientation: "vertical", type })}>
          <Base.Thumb className={thumb({ orientation: "vertical" })} />
        </Base.Scrollbar>
      )}
      {showHorizontal && (
        <Base.Scrollbar orientation="horizontal" className={scrollbar({ orientation: "horizontal", type })}>
          <Base.Thumb className={thumb({ orientation: "horizontal" })} />
        </Base.Scrollbar>
      )}
      <Base.Corner className={corner} />
    </Base.Root>
  );
};

export const MotionScrollArea = m.create(ScrollArea);
