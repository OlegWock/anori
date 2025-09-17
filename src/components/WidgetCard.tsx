import { Component, type ComponentProps, createContext, createRef, useContext, useRef, useState } from "react";
import "./WidgetCard.scss";
import { builtinIcons } from "@anori/components/icon/builtin-icons";
import { useParentFolder } from "@anori/utils/FolderContentContext";
import { useSizeSettings } from "@anori/utils/compact";
import { type DndItemMeta, ensureDndItemType, useDraggable } from "@anori/utils/drag-and-drop";
import { type LayoutItemSize, type Position, positionToPixelPosition, snapToSector } from "@anori/utils/grid";
import { useOnChangeLayoutEffect, useRunAfterNextRender } from "@anori/utils/hooks";
import { minmax } from "@anori/utils/misc";
import { useDerivedMotionValue } from "@anori/utils/motion/derived-motion.value";
import { WidgetMetadataContext } from "@anori/utils/plugin";
import type { AnoriPlugin, WidgetDescriptor } from "@anori/utils/user-data/types";
import clsx from "clsx";
import { type PanInfo, m, useMotionValue } from "framer-motion";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { Button } from "./Button";
import { Icon } from "./icon/Icon";

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: any) {
    console.error("Error happened inside widget");
    console.error(error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <>
          <h2>Oops</h2>
          <div className="error-description">Widget failed to render, check console for details.</div>
        </>
      );
    }

    return this.props.children;
  }
}

const WidgetCardContext = createContext({
  cardRef: createRef<HTMLDivElement>(),
});

type WidgetCardProps<T extends {}, PT extends T> = {
  widget: WidgetDescriptor<T>;
  plugin: AnoriPlugin<any, PT>;
} & (
  | {
      type: "mock";
      config?: undefined;
      instanceId?: undefined;
      size?: undefined;
      position?: undefined;
      onUpdateConfig?: undefined;
      onRemove?: undefined;
      onEdit?: undefined;
      onResize?: undefined;
      onPositionChange?: undefined;
      onMoveToFolder?: undefined;
    }
  | {
      type: "widget";
      config: T;
      instanceId: string;
      size: LayoutItemSize;
      position: Position;
      onUpdateConfig: (config: Partial<T>) => void;
      onRemove?: () => void;
      onEdit?: () => void;
      onResize?: (newWidth: number, newHeight: number) => boolean | undefined;
      onPositionChange?: (newPosition: Position) => void;
      onMoveToFolder?: (folderId: string) => void;
    }
) &
  Omit<ComponentProps<typeof m.div>, "children" | "onDragEnd" | "onResize">;

export const WidgetCard = <T extends {}, PT extends T>({
  className,
  style,
  widget,
  plugin,
  type,
  config,
  instanceId,
  size,
  position,
  onUpdateConfig,
  onRemove,
  onEdit,
  onResize,
  onPositionChange,
  onMoveToFolder,
  ...props
}: WidgetCardProps<T, PT>) => {
  const startResize = () => {
    setIsResizing(true);
  };

  const convertUnitsToPixels = (unit: number) => unit * grid.boxSize - gapSize * 2;

  const convertPixelsToUnits = (px: number) => Math.round((px + gapSize * 2) / grid.boxSize);

  const updateResize = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (!widget.appearance.resizable) return;
    const res = widget.appearance.resizable;
    const minWidth = res === true ? 1 : (res.min?.width ?? 1);
    const minHeight = res === true ? 1 : (res.min?.height ?? 1);
    const maxWidth = res === true ? 999 : (res.max?.width ?? 999);
    const maxHeight = res === true ? 999 : (res.max?.height ?? 999);
    const newWidth = minmax(
      convertUnitsToPixels(sizeToUse.width) + info.offset.x,
      convertUnitsToPixels(minWidth),
      convertUnitsToPixels(maxWidth),
    );
    const newHeight = minmax(
      convertUnitsToPixels(sizeToUse.height) + info.offset.y,
      convertUnitsToPixels(minHeight),
      convertUnitsToPixels(maxHeight),
    );
    const widthUnits = convertPixelsToUnits(newWidth);
    if (resizeWidthUnits !== widthUnits) setResizeWidthUnits(widthUnits);
    const heightUnits = convertPixelsToUnits(newHeight);
    if (resizeHeightUnits !== heightUnits) setResizeHeightUnits(heightUnits);
    resizeWidth.set(newWidth);
    resizeHeight.set(newHeight);
  };

  const finishResize = (_event: MouseEvent | TouchEvent | PointerEvent, _info: PanInfo) => {
    setIsResizing(false);
    let shouldReset = true;
    if (onResize) {
      shouldReset = !onResize(resizeWidthUnits, resizeHeightUnits);
    }
    if (shouldReset) {
      resizeWidth.set(convertUnitsToPixels(sizeToUse.width));
      resizeHeight.set(convertUnitsToPixels(sizeToUse.height));
      setResizeWidthUnits(sizeToUse.width);
      setResizeHeightUnits(sizeToUse.height);
    }
  };

  const onDragEnd = (
    foundDestination: DndItemMeta | null,
    _e: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo,
  ) => {
    setIsDragging(false);
    if (foundDestination && ensureDndItemType(foundDestination, "folder")) {
      onMoveToFolder?.(foundDestination.id);
      return;
    }

    if (!gridRef.current) return;
    const mainBox = gridRef.current.getBoundingClientRect();
    const relativePoint = {
      x: info.point.x - mainBox.x,
      y: info.point.y - mainBox.y,
    };
    const possibleSnapPoints = snapToSector({ grid, position: relativePoint });
    if (possibleSnapPoints.length === 0) return;
    onPositionChange?.(possibleSnapPoints[0].position);
  };

  const { isEditing, grid, gridRef } = useParentFolder();

  const { gapSize, rem } = useSizeSettings();
  const ref = useRef<HTMLDivElement>(null);
  const runAfterRender = useRunAfterNextRender();

  const sizeToUse = size ? size : widget.appearance.size;

  const resizeWidth = useMotionValue(convertUnitsToPixels(sizeToUse.width));
  const resizeHeight = useMotionValue(convertUnitsToPixels(sizeToUse.height));
  // We need a derived/readonly value to block framer motion from messing with value after initial render
  // More info: https://github.com/OlegWock/anori/issues/115
  const readonlyResizeWidth = useDerivedMotionValue(resizeWidth, (v) => v);
  const readonlyResizeHeight = useDerivedMotionValue(resizeHeight, (v) => v);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeWidthUnits, setResizeWidthUnits] = useState(sizeToUse.width);
  const [resizeHeightUnits, setResizeHeightUnits] = useState(sizeToUse.height);

  const [isDragging, setIsDragging] = useState(false);

  const pixelPosition = position ? positionToPixelPosition({ grid, position }) : { x: 0, y: 0 };

  const { dragControls, elementProps, dragHandleProps } = useDraggable(
    {
      type: "widget",
      id: instanceId || "",
    },
    {
      onDragEnd,
      whileDrag: { zIndex: 9, boxShadow: "0px 4px 4px 3px rgba(0,0,0,0.4)" },
    },
  );
  const drag = type === "widget";
  const dragProps = drag
    ? {
        drag,
        dragSnapToOrigin: true,
        dragElastic: 0,
        ...elementProps,
      }
    : {};

  const children = type === "mock" ? <widget.mock /> : <widget.mainScreen instanceId={instanceId} config={config} />;

  useOnChangeLayoutEffect(() => {
    resizeWidth.set(convertUnitsToPixels(sizeToUse.width));
    resizeHeight.set(convertUnitsToPixels(sizeToUse.height));
    setResizeWidthUnits(sizeToUse.width);
    setResizeHeightUnits(sizeToUse.height);
    setIsResizing(false);
  }, [sizeToUse.width, sizeToUse.height, grid.boxSize, gapSize]);

  const card = (
    <m.div
      id={instanceId ? `WidgetCard-${instanceId}` : undefined}
      ref={ref}
      key={`card-${instanceId}`}
      className={clsx(className, "WidgetCard", !widget.appearance.withoutPadding && "with-padding")}
      transition={{ ease: "easeInOut", duration: 0.15 }}
      exit={isEditing ? { scale: 0 } : undefined}
      whileHover={
        widget.appearance.withHoverAnimation
          ? {
              scale: isEditing ? undefined : 1.05,
            }
          : undefined
      }
      whileTap={
        widget.appearance.withHoverAnimation
          ? {
              scale: isEditing ? undefined : 0.95,
            }
          : undefined
      }
      style={{
        width: readonlyResizeWidth,
        height: readonlyResizeHeight,
        margin: gapSize,
        boxShadow: isResizing ? "0px 4px 4px 3px rgba(0,0,0,0.4)" : "0px 0px 0px 0px rgba(0,0,0,0.0)",
        zIndex: isResizing || isDragging ? 9 : 0,
        position: type === "widget" ? "absolute" : undefined,
        top: isDragging ? (gridRef.current?.getBoundingClientRect().top ?? 0) + pixelPosition.y : pixelPosition.y,
        left: isDragging ? (gridRef.current?.getBoundingClientRect().left ?? 0) + pixelPosition.x : pixelPosition.x,
        ...style,
      }}
      {...dragProps}
      {...props}
    >
      {isEditing && type === "widget" && !!onDragEnd && (
        <Button
          className="drag-widget-btn"
          onPointerDown={(e) => {
            e.preventDefault();
            setIsDragging(true);
            runAfterRender(() => dragControls.start(e));
          }}
          onPointerUp={() => setIsDragging(false)}
          withoutBorder
          {...dragHandleProps}
        >
          <Icon icon={builtinIcons.dragHandle} width={rem(1.25)} height={rem(1.25)} />
        </Button>
      )}
      {isEditing && type === "widget" && !!onRemove && (
        <Button className="remove-widget-btn" onClick={onRemove} withoutBorder>
          <Icon icon={builtinIcons.close} width={rem(1.25)} height={rem(1.25)} />
        </Button>
      )}
      {isEditing && type === "widget" && !!onEdit && (
        <Button className="edit-widget-btn" onClick={onEdit} withoutBorder>
          <Icon icon={builtinIcons.pencil} width={rem(1.25)} height={rem(1.25)} />
        </Button>
      )}
      {isEditing && type === "widget" && !!widget.appearance.resizable && (
        <m.div
          className="resize-handle"
          onPointerDown={(e) => e.preventDefault()}
          onPanStart={startResize}
          onPan={updateResize}
          onPanEnd={finishResize}
        >
          <Icon icon={builtinIcons.resize} width={rem(1.25)} height={rem(1.25)} style={{ rotate: 90 }} />
        </m.div>
      )}
      <ErrorBoundary>
        <div className="overflow-protection">
          {children}
          {(type === "mock" || isResizing || isDragging) && <div className="interaction-blocker" />}
        </div>
      </ErrorBoundary>
    </m.div>
  );

  return (
    <WidgetCardContext.Provider value={{ cardRef: ref }}>
      <WidgetMetadataContext.Provider
        value={{
          pluginId: plugin.id,
          widgetId: widget.id,
          instanceId: instanceId ?? "mock",
          size: isResizing ? { width: resizeWidthUnits, height: resizeHeightUnits } : sizeToUse,
          config: config ?? {},
          updateConfig: (newConf) => onUpdateConfig?.(newConf as Partial<T>),
        }}
      >
        {isDragging ? createPortal(card, document.body, `card-${instanceId}`) : card}
      </WidgetMetadataContext.Provider>
    </WidgetCardContext.Provider>
  );
};

export const useParentWidgetCardRef = () => {
  return useContext(WidgetCardContext).cardRef;
};
