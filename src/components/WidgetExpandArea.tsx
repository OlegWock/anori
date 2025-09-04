import {
  type Transition,
  m,
  useAnimate,
  useMotionTemplate,
  useMotionValue,
  usePresence,
  useTransform,
} from "framer-motion";
import "./WidgetExpandArea.scss";
import { useSizeSettings } from "@anori/utils/compact";
import { useHotkeys, usePrevious } from "@anori/utils/hooks";
import { minmax } from "@anori/utils/misc";
import { useDirection } from "@radix-ui/react-direction";
import clsx from "clsx";
import { type ReactNode, useLayoutEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Icon } from "./Icon";
import { ScrollArea } from "./ScrollArea";
import { useParentWidgetCardRef } from "./WidgetCard";

export type WidgetExpandAreaProps = {
  children: ReactNode;
  title?: string;
  size?: "auto" | "max" | { width?: number; height?: number };
  className?: string;
  closable?: boolean;
  onClose?: () => void;
  withoutScroll?: boolean;
  extraButtons?: ReactNode;
};

const BORDER_RADIUS = 24;
const SCREEN_PADDING = 36;

const transition: Transition = {
  type: "tween",
  ease: "easeInOut",
};

export const WidgetExpandArea = ({
  children,
  onClose,
  title,
  className,
  closable = true,
  size = "auto",
  withoutScroll = false,
  extraButtons,
}: WidgetExpandAreaProps) => {
  const playUnmount = () => {
    if (!areaRef.current) {
      console.warn("WidgetExpandArea ref is missing on unmount");
      safeToRemove?.();
      return;
    }

    if (!cardRef.current) {
      console.error("You should use WidgetExpandArea only inside widge");
      safeToRemove?.();
      return;
    }

    const cardBox = cardRef.current.getBoundingClientRect();
    const realAreaBox = areaRef.current.getBoundingClientRect();
    const xScale = cardBox.width / realAreaBox.width;
    const yScale = cardBox.height / realAreaBox.height;
    const duration = 0.2;
    const topEdgeScale = cardBox.top - realAreaBox.top;
    const bottomEdgeScale = realAreaBox.top + realAreaBox.height - cardBox.bottom;

    const leftEdgeScale = cardBox.left - realAreaBox.left;
    const rightEdgeScale = realAreaBox.left + realAreaBox.width - (cardBox.x + cardBox.width);

    const originX = (leftEdgeScale / (leftEdgeScale + rightEdgeScale)) * realAreaBox.width;
    const originY = (topEdgeScale / (topEdgeScale + bottomEdgeScale)) * realAreaBox.height;
    transformOriginX.jump(originX);
    transformOriginY.jump(originY);

    const bgLighter = getComputedStyle(document.documentElement).getPropertyValue("--background-lighter");

    animate(contentOpacity, 0, { ...transition, duration: duration / 2 })
      .then(() => {
        animate(windowColor, bgLighter, { ...transition, duration });
        return animate(scaleY, yScale, { ...transition, duration });
      })
      .then(() => {
        animate(backdropOpacity, 0, { ...transition, duration });
        return animate(scaleX, xScale, { ...transition, duration });
      })
      .then(() => safeToRemove?.());
  };

  const positionX = useMotionValue(0);
  const positionY = useMotionValue(0);
  const width = useMotionValue(typeof size === "object" && size.width ? size.width : 0);
  const height = useMotionValue(typeof size === "object" && size.height ? size.height : 0);
  const positionXCorrected = useTransform<number, number>(positionX, (x) => {
    return minmax(x, 0, window.innerWidth - 100);
  });
  const positionYCorrected = useTransform<number, number>(positionY, (y) => {
    return minmax(y, 0, window.innerHeight - 100);
  });
  const zIndexMotion = useMotionValue(100);

  const transformOriginX = useMotionValue(50);
  const transformOriginY = useMotionValue(50);
  const transformOriginStr = useMotionTemplate`${transformOriginX}px ${transformOriginY}px`;
  const scaleX = useMotionValue(1);
  const scaleY = useMotionValue(1);
  const borderRadiusStr = useTransform<number, string>([scaleX, scaleY], ([sx, sy]) => {
    return `${BORDER_RADIUS / sx}px / ${BORDER_RADIUS / sy}px`;
  });
  const backdropOpacity = useMotionValue(0.7);
  const backgroundStr = useTransform(backdropOpacity, (v) => `rgba(0, 0, 0, ${v.toFixed(2)})`);
  const contentOpacity = useMotionValue(1);
  const windowColor = useMotionValue("var(--background)");

  const areaRef = useRef<HTMLDivElement>(null);
  const cardRef = useParentWidgetCardRef();

  const [scope, animate] = useAnimate();
  const [isPresent, safeToRemove] = usePresence();
  const prevIsPresent = usePrevious(isPresent, true);
  const dir = useDirection();
  const { rem } = useSizeSettings();

  const shouldShowControlStip = Boolean(title || extraButtons);

  useHotkeys("esc", () => onClose?.());

  useLayoutEffect(() => {
    if (!areaRef.current) {
      console.warn("WidgetExpandArea ref is missing in layout effect");
      return;
    }

    if (!cardRef.current) {
      console.error("You should use WidgetExpandArea only inside widge");
      return;
    }

    const cardBox = cardRef.current.getBoundingClientRect();
    const realAreaBox = areaRef.current.getBoundingClientRect();

    const cardCenterX = cardBox.left + cardBox.width / 2;
    const cardCenterY = cardBox.top + cardBox.height / 2;

    console.log("Card coordinates", { cardBox, cardCenterX, cardCenterY, realAreaBox });

    let areaCenterX = cardCenterX;
    let areaCenterY = cardCenterY;

    if (areaCenterY - realAreaBox.height / 2 < SCREEN_PADDING) {
      // Top edge overflows screen
      areaCenterY = SCREEN_PADDING + realAreaBox.height / 2;
    }
    if (areaCenterY + realAreaBox.height / 2 > window.innerHeight - SCREEN_PADDING) {
      // Bottom edge overflows screen
      areaCenterY = window.innerHeight - SCREEN_PADDING - realAreaBox.height / 2;
    }
    if (areaCenterX - realAreaBox.width / 2 < SCREEN_PADDING) {
      // Left edge overflows screen
      areaCenterX = SCREEN_PADDING + realAreaBox.width / 2;
    }
    if (areaCenterX + realAreaBox.width / 2 > window.innerWidth - SCREEN_PADDING) {
      // Right edge overflows screen
      areaCenterX = window.innerWidth - SCREEN_PADDING - realAreaBox.width / 2;
    }

    const areaPositionX = areaCenterX - realAreaBox.width / 2;
    const areaPositionY = areaCenterY - realAreaBox.height / 2;
    positionX.jump(areaPositionX);
    positionY.jump(areaPositionY);

    const xScale = cardBox.width / realAreaBox.width;
    const yScale = cardBox.height / realAreaBox.height;
    const duration = 0.2;
    scaleX.jump(xScale);
    scaleY.jump(yScale);

    const topEdgeScale = cardBox.top - areaPositionY;
    const bottomEdgeScale = areaPositionY + realAreaBox.height - cardBox.bottom;

    const leftEdgeScale = cardBox.left - areaPositionX;
    const rightEdgeScale = areaPositionX + realAreaBox.width - (cardBox.x + cardBox.width);

    const originX = (leftEdgeScale / (leftEdgeScale + rightEdgeScale)) * realAreaBox.width;
    const originY = (topEdgeScale / (topEdgeScale + bottomEdgeScale)) * realAreaBox.height;

    transformOriginX.jump(originX);
    transformOriginY.jump(originY);

    backdropOpacity.jump(0);
    contentOpacity.jump(0);
    const bgLighter = getComputedStyle(document.documentElement).getPropertyValue("--background-lighter");
    const bgDarker = getComputedStyle(document.documentElement).getPropertyValue("--background");
    windowColor.jump(bgLighter);

    animate(scaleX, 1, { ...transition, duration })
      .then(() => {
        animate(windowColor, bgDarker, { ...transition, duration });
        return animate(scaleY, 1, { ...transition, duration });
      })
      .then(() => {
        return animate(contentOpacity, 1, { ...transition, duration: duration / 2 });
      });
    animate(backdropOpacity, 0.75, { ...transition, duration });
  }, [animate]);

  if (!isPresent && prevIsPresent) {
    playUnmount();
  }

  return createPortal(
    <m.div
      className="WidgetExpandArea-backdrop"
      key="backdrop"
      dir="ltr"
      ref={scope}
      onClick={(e) => {
        e.stopPropagation();
        onClose?.();
      }}
      style={{
        backgroundColor: backgroundStr,
        zIndex: 100,
      }}
    >
      <m.div
        className={clsx(
          "WidgetExpandArea",
          typeof size === "string" && `size-${size}`,
          typeof size === "object" && `size-predefined`,
          withoutScroll && "without-inner-padding",
        )}
        dir="ltr"
        ref={areaRef}
        key="area"
        style={{
          transformOrigin: transformOriginStr,
          scaleX: scaleX,
          scaleY: scaleY,
          top: positionYCorrected,
          left: positionXCorrected,
          borderRadius: borderRadiusStr,
          position: "relative",
          zIndex: zIndexMotion,
          width: typeof size === "object" && size.width ? width : undefined,
          height: typeof size === "object" && size.height ? height : undefined,
          boxShadow: "rgba(0, 0, 0, 0.24) 0px 3px 8px",
          backgroundColor: windowColor,
          pointerEvents: "auto",
        }}
      >
        {shouldShowControlStip && (
          <m.div
            className="window-control-strip"
            dir={dir}
            style={{
              opacity: contentOpacity,
            }}
          >
            <m.h3 className="window-title">{title}</m.h3>
            <m.div className="window-buttons">
              {extraButtons}
              {closable && (
                <m.button
                  onClick={onClose}
                  whileHover={{
                    rotate: 180,
                    transition: { duration: 0.2 },
                  }}
                >
                  <Icon icon="ion:close" width={rem(1.5)} height={rem(1.5)} />
                </m.button>
              )}
            </m.div>
          </m.div>
        )}
        <m.div
          className={clsx("WidgetExpandArea-content", className)}
          style={{
            opacity: contentOpacity,
          }}
          dir={dir}
        >
          {withoutScroll && children}
          {!withoutScroll && (
            <ScrollArea color="dark" type="hover" direction="both">
              {children}
            </ScrollArea>
          )}
        </m.div>
      </m.div>
    </m.div>,
    document.body,
  );
};
