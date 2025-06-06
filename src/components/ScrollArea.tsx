import * as RadixScrollArea from "@radix-ui/react-scroll-area";
import "./ScrollArea.scss";
import { combineRefs } from "@anori/utils/react";
import { useDirection } from "@radix-ui/react-direction";
import clsx from "clsx";
import { m } from "framer-motion";
import { type ComponentProps, type ReactNode, type Ref, type WheelEvent, useCallback, useEffect, useRef } from "react";
import { forwardRef } from "react";

type ScrollAreaProps = {
  children?: ReactNode;
  className?: string;
  contentClassName?: string;
  color?: "light" | "dark" | "translucent";
  type?: RadixScrollArea.ScrollAreaContextValue["type"];
  direction?: "vertical" | "horizontal" | "both";
  mirrorVerticalScrollToHorizontal?: boolean;
  size?: "normal" | "thin";
  onVerticalOverflowStatusChange?: (overflows: boolean) => void;
  onHorizontalOverflowStatusChange?: (overflows: boolean) => void;
  viewportRef?: Ref<HTMLDivElement>;
} & ComponentProps<typeof m.div>;

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
      color = "light",
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
        className={clsx("ScrollAreaRoot", className, `color-${color}`, `direction-${direction}`, `size-${size}`)}
        asChild
        type={type}
        ref={ref}
      >
        <m.div {...props}>
          <ResizeObserverComponent onResize={onContentResize} />
          <MotionViewport
            className={clsx("ScrollAreaViewport", contentClassName)}
            ref={mergedRef}
            layoutScroll
            layoutRoot
            onWheel={direction === "horizontal" && mirrorVerticalScrollToHorizontal ? mirrorScroll : undefined}
          >
            {children}
          </MotionViewport>
          {["vertical", "both"].includes(direction) && (
            <RadixScrollArea.Scrollbar className="ScrollAreaScrollbar" orientation="vertical">
              <RadixScrollArea.Thumb className="ScrollAreaThumb" />
            </RadixScrollArea.Scrollbar>
          )}
          {["horizontal", "both"].includes(direction) && (
            <RadixScrollArea.Scrollbar className="ScrollAreaScrollbar" orientation="horizontal">
              <RadixScrollArea.Thumb className="ScrollAreaThumb" />
            </RadixScrollArea.Scrollbar>
          )}
          <RadixScrollArea.Corner className="ScrollAreaCorner" />
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

  return <></>;
};

export const MotionScrollArea = m.create(ScrollArea);
