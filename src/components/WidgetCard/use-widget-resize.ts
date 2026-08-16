import { useSizeSettings } from "@anori/utils/compact";
import { useParentFolder } from "@anori/utils/FolderContentContext";
import type { GridItemSize, GridPosition } from "@anori/utils/grid/types";
import { GRID_DRAG_EXTEND_SLOTS } from "@anori/utils/grid/utils";
import { useMirrorStateToRef, useOnChangeLayoutEffect } from "@anori/utils/hooks";
import { minmax } from "@anori/utils/misc";
import { useDerivedMotionValue } from "@anori/utils/motion/derived-motion.value";
import type { SomeWidget } from "@anori/utils/plugins/types";
import { useMotionValue } from "motion/react";
import { type PointerEvent as ReactPointerEvent, type RefObject, useEffect, useRef, useState } from "react";

const AUTOSCROLL_ZONE_PX = 80;
const AUTOSCROLL_MAX_SPEED_PX_PER_FRAME = 12;

const autoscrollVelocity = (pos: number, start: number, end: number) => {
  if (pos < start + AUTOSCROLL_ZONE_PX) {
    return -AUTOSCROLL_MAX_SPEED_PX_PER_FRAME * minmax((start + AUTOSCROLL_ZONE_PX - pos) / AUTOSCROLL_ZONE_PX, 0, 1);
  }
  if (pos > end - AUTOSCROLL_ZONE_PX) {
    return AUTOSCROLL_MAX_SPEED_PX_PER_FRAME * minmax((pos - (end - AUTOSCROLL_ZONE_PX)) / AUTOSCROLL_ZONE_PX, 0, 1);
  }
  return 0;
};

const findScrollContainer = (el: HTMLElement | null): HTMLElement | null => {
  for (let node = el?.parentElement ?? null; node; node = node.parentElement) {
    const { overflowX, overflowY } = getComputedStyle(node);
    if (/auto|scroll/.test(overflowX + overflowY)) return node;
  }
  return null;
};

export type UseWidgetResizeOptions = {
  resizable: SomeWidget["appearance"]["resizable"];
  size: GridItemSize;
  position?: GridPosition;
  cardRef: RefObject<HTMLDivElement | null>;
  onResize?: (newWidth: number, newHeight: number) => boolean | undefined;
  onResizePreview?: (size: GridItemSize | null) => void;
};

export const useWidgetResize = ({
  resizable,
  size,
  position,
  cardRef,
  onResize,
  onResizePreview,
}: UseWidgetResizeOptions) => {
  const { grid } = useParentFolder();
  const { gapSize } = useSizeSettings();

  const convertUnitsToPixels = (unit: number) => unit * grid.boxSize - gapSize * 2;
  const convertPixelsToUnits = (px: number) => Math.round((px + gapSize * 2) / grid.boxSize);

  const startResize = (e: ReactPointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    resizeActive.current = true;
    resizeStart.current = { x: e.clientX, y: e.clientY };
    resizePointer.current = { x: e.clientX, y: e.clientY };
    resizeScrollContainer.current = findScrollContainer(cardRef.current);
    resizeScrollStart.current = {
      left: resizeScrollContainer.current?.scrollLeft ?? 0,
      top: resizeScrollContainer.current?.scrollTop ?? 0,
    };
    startResizeAutoscroll();
    setIsResizing(true);
    onResizePreview?.({ width: size.width, height: size.height });
  };

  const startResizeAutoscroll = () => {
    const step = () => {
      if (!resizeActive.current) {
        autoscrollFrame.current = null;
        return;
      }
      const container = resizeScrollContainer.current;
      if (container) {
        const rect = container.getBoundingClientRect();
        const vx = autoscrollVelocity(resizePointer.current.x, rect.left, rect.right);
        const vy = autoscrollVelocity(resizePointer.current.y, rect.top, rect.bottom);
        if (vx !== 0 || vy !== 0) {
          container.scrollLeft += vx;
          container.scrollTop += vy;
          applyResizeRef.current();
        }
      }
      autoscrollFrame.current = requestAnimationFrame(step);
    };
    autoscrollFrame.current = requestAnimationFrame(step);
  };

  const updateResize = (e: ReactPointerEvent<HTMLButtonElement>) => {
    resizePointer.current = { x: e.clientX, y: e.clientY };
    applyResize();
  };

  const applyResize = () => {
    if (!resizeActive.current || !resizable) return;
    const minWidth = resizable === true ? 1 : (resizable.min?.width ?? 1);
    const minHeight = resizable === true ? 1 : (resizable.min?.height ?? 1);
    const maxWidth = Math.min(
      resizable === true ? 999 : (resizable.max?.width ?? 999),
      position ? grid.columns + GRID_DRAG_EXTEND_SLOTS - position.x : 999,
    );
    const maxHeight = Math.min(
      resizable === true ? 999 : (resizable.max?.height ?? 999),
      position ? grid.rows + GRID_DRAG_EXTEND_SLOTS - position.y : 999,
    );
    const scrollDriftX = (resizeScrollContainer.current?.scrollLeft ?? 0) - resizeScrollStart.current.left;
    const scrollDriftY = (resizeScrollContainer.current?.scrollTop ?? 0) - resizeScrollStart.current.top;
    const offsetX = resizePointer.current.x - resizeStart.current.x + scrollDriftX;
    const offsetY = resizePointer.current.y - resizeStart.current.y + scrollDriftY;
    const newWidth = minmax(
      convertUnitsToPixels(size.width) + offsetX,
      convertUnitsToPixels(minWidth),
      convertUnitsToPixels(maxWidth),
    );
    const newHeight = minmax(
      convertUnitsToPixels(size.height) + offsetY,
      convertUnitsToPixels(minHeight),
      convertUnitsToPixels(maxHeight),
    );
    const newWidthUnits = convertPixelsToUnits(newWidth);
    if (widthUnits !== newWidthUnits) setWidthUnits(newWidthUnits);
    const newHeightUnits = convertPixelsToUnits(newHeight);
    if (heightUnits !== newHeightUnits) setHeightUnits(newHeightUnits);
    if (widthUnits !== newWidthUnits || heightUnits !== newHeightUnits) {
      onResizePreview?.({ width: newWidthUnits, height: newHeightUnits });
    }
    resizeWidth.set(newWidth);
    resizeHeight.set(newHeight);
  };

  const finishResize = (e: ReactPointerEvent<HTMLButtonElement>) => {
    if (!resizeActive.current) return;
    resizeActive.current = false;
    if (autoscrollFrame.current !== null) {
      cancelAnimationFrame(autoscrollFrame.current);
      autoscrollFrame.current = null;
    }
    e.currentTarget.releasePointerCapture(e.pointerId);
    setIsResizing(false);
    onResizePreview?.(null);
    let shouldReset = true;
    if (onResize) {
      shouldReset = !onResize(widthUnits, heightUnits);
    }
    if (shouldReset) {
      resizeWidth.set(convertUnitsToPixels(size.width));
      resizeHeight.set(convertUnitsToPixels(size.height));
      setWidthUnits(size.width);
      setHeightUnits(size.height);
    }
  };

  const resizeActive = useRef(false);
  const resizeStart = useRef({ x: 0, y: 0 });
  const resizePointer = useRef({ x: 0, y: 0 });
  const resizeScrollContainer = useRef<HTMLElement | null>(null);
  const resizeScrollStart = useRef({ left: 0, top: 0 });
  const autoscrollFrame = useRef<number | null>(null);
  const applyResizeRef = useMirrorStateToRef(applyResize);

  useEffect(() => {
    return () => {
      if (autoscrollFrame.current !== null) cancelAnimationFrame(autoscrollFrame.current);
    };
  }, []);

  const resizeWidth = useMotionValue(convertUnitsToPixels(size.width));
  const resizeHeight = useMotionValue(convertUnitsToPixels(size.height));
  // We need a derived/readonly value to block framer motion from messing with value after initial render
  // More info: https://github.com/OlegWock/anori/issues/115
  const width = useDerivedMotionValue(resizeWidth, (v) => v);
  const height = useDerivedMotionValue(resizeHeight, (v) => v);
  const [isResizing, setIsResizing] = useState(false);
  const [widthUnits, setWidthUnits] = useState(size.width);
  const [heightUnits, setHeightUnits] = useState(size.height);

  useOnChangeLayoutEffect(() => {
    resizeWidth.set(convertUnitsToPixels(size.width));
    resizeHeight.set(convertUnitsToPixels(size.height));
    setWidthUnits(size.width);
    setHeightUnits(size.height);
    setIsResizing(false);
  }, [size.width, size.height, grid.boxSize, gapSize]);

  return {
    isResizing,
    width,
    height,
    widthUnits,
    heightUnits,
    handleProps: {
      onPointerDown: startResize,
      onPointerMove: updateResize,
      onPointerUp: finishResize,
    },
  };
};
