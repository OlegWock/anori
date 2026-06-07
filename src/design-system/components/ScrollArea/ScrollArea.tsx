import { combineRefs } from "@anori/utils/react";
import { useDirection } from "@radix-ui/react-direction";
import * as RadixScrollArea from "@radix-ui/react-scroll-area";
import { m } from "framer-motion";
import {
  type ComponentProps,
  forwardRef,
  type ReactNode,
  type Ref,
  useCallback,
  useEffect,
  useRef,
  type WheelEvent,
} from "react";
import { css, cva, cx } from "styled-system/css";
import "./ScrollArea.css";

type ScrollAreaProps = {
  children?: ReactNode;
  className?: string;
  contentClassName?: string;
  type?: RadixScrollArea.ScrollAreaContextValue["type"];
  direction?: "vertical" | "horizontal" | "both";
  mirrorVerticalScrollToHorizontal?: boolean;
  size?: "normal" | "thin";
  onVerticalOverflowStatusChange?: (overflows: boolean) => void;
  onHorizontalOverflowStatusChange?: (overflows: boolean) => void;
  viewportRef?: Ref<HTMLDivElement>;
} & ComponentProps<typeof m.div>;

// Each radix part is styled directly (not via descendant selectors on the root). The parts also keep
// their marker class names (ScrollAreaRoot/Viewport/Scrollbar) — a public hook a few widgets target
// from SCSS. `--scrollbar-size` is set on the root by the `size` variant and inherited by the rail/thumb.
const root = cva({
  base: {
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
});

const scrollbar = cva({
  base: {
    display: "flex",
    userSelect: "none",
    touchAction: "none",
    padding: "0-5",
    borderRadius: "var(--scrollbar-size)",
    background: "transparent",
    transition: "background 160ms ease-out",
  },
  variants: {
    orientation: {
      vertical: { width: "var(--scrollbar-size)" },
      horizontal: { flexDirection: "column", height: "var(--scrollbar-size)" },
    },
  },
});

const thumb = cva({
  base: {
    flex: 1,
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
      vertical: { "&::before": { minHeight: "44px" } },
      horizontal: { "&::before": { minWidth: "44px" } },
    },
  },
  defaultVariants: { orientation: "vertical" },
});

const corner = css({ background: "transparent" });

const checkVerticalOverflow = (el: Element) => el.clientHeight < el.scrollHeight;
const checkHorizontalOverflow = (el: Element) => el.clientWidth < el.scrollWidth;

const MotionViewport = m.create(RadixScrollArea.ScrollAreaViewport);

export const ScrollArea = forwardRef<HTMLDivElement, ScrollAreaProps>(
  (
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
      ...props
    },
    ref,
  ) => {
    const mirrorScroll = (e: WheelEvent<HTMLDivElement>) => {
      e.stopPropagation();
      if (e.deltaY) {
        e.currentTarget.scrollLeft += e.deltaY;
      }
    };

    const onContentResize = useCallback(() => {
      if (!localViewportRef.current) return;
      const newHorizontalOverflow = checkHorizontalOverflow(localViewportRef.current);
      const newVerticalOverflow = checkVerticalOverflow(localViewportRef.current);

      if (newHorizontalOverflow !== horizontalOverflowRef.current) {
        onHorizontalOverflowStatusChange?.(newHorizontalOverflow);
      }

      if (newVerticalOverflow !== verticalOverflowRef.current) {
        onVerticalOverflowStatusChange?.(newVerticalOverflow);
      }

      horizontalOverflowRef.current = newHorizontalOverflow;
      verticalOverflowRef.current = newVerticalOverflow;
    }, [onHorizontalOverflowStatusChange, onVerticalOverflowStatusChange]);

    const localViewportRef = useRef<HTMLDivElement>(null);
    const mergedRef = combineRefs(localViewportRef, viewportRef);
    const horizontalOverflowRef = useRef(false);
    const verticalOverflowRef = useRef(false);
    const dir = useDirection();

    return (
      <RadixScrollArea.Root
        dir={dir}
        className={cx(root({ size, direction }), "ScrollAreaRoot", className)}
        asChild
        type={type}
        ref={ref}
      >
        <m.div {...props}>
          <ResizeObserverComponent onResize={onContentResize} />
          <MotionViewport
            className={cx(viewport, "ScrollAreaViewport", contentClassName)}
            ref={mergedRef}
            layoutScroll
            layoutRoot
            onWheel={direction === "horizontal" && mirrorVerticalScrollToHorizontal ? mirrorScroll : undefined}
          >
            {children}
          </MotionViewport>
          {["vertical", "both"].includes(direction) && (
            <RadixScrollArea.Scrollbar
              className={cx(scrollbar({ orientation: "vertical" }), "ScrollAreaScrollbar")}
              orientation="vertical"
            >
              <RadixScrollArea.Thumb className={cx(thumb({ orientation: "vertical" }), "ScrollAreaThumb")} />
            </RadixScrollArea.Scrollbar>
          )}
          {["horizontal", "both"].includes(direction) && (
            <RadixScrollArea.Scrollbar
              className={cx(scrollbar({ orientation: "horizontal" }), "ScrollAreaScrollbar")}
              orientation="horizontal"
            >
              <RadixScrollArea.Thumb className={cx(thumb({ orientation: "horizontal" }), "ScrollAreaThumb")} />
            </RadixScrollArea.Scrollbar>
          )}
          <RadixScrollArea.Corner className={cx(corner, "ScrollAreaCorner")} />
        </m.div>
      </RadixScrollArea.Root>
    );
  },
);

const ResizeObserverComponent = ({ onResize }: { onResize: () => void }) => {
  const ctx = RadixScrollArea.useScrollAreaContext();

  useEffect(() => {
    const observer = new ResizeObserver(() => {
      onResize();
    });

    if (ctx.content) {
      observer.observe(ctx.content);
    }

    return () => observer.disconnect();
  }, [ctx.content, onResize]);

  return null;
};

export const MotionScrollArea = m.create(ScrollArea);
