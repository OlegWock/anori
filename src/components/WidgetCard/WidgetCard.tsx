import { Heading } from "@anori/design-system/components/Heading/Heading";
import { builtinIcons } from "@anori/design-system/components/Icon/builtin-icons";
import { IconButton } from "@anori/design-system/components/IconButton/IconButton";
import { useSizeSettings } from "@anori/utils/compact";
import { type DndItemMeta, ensureDndItemType, useCurrentlyDragging, useDraggable } from "@anori/utils/drag-and-drop";
import { useParentFolder } from "@anori/utils/FolderContentContext";
import type { GridItemSize, GridPosition } from "@anori/utils/grid/types";
import { positionToPixelPosition, snapToSector } from "@anori/utils/grid/utils";
import { useOnChangeLayoutEffect, useRunAfterNextRender } from "@anori/utils/hooks";
import { minmax } from "@anori/utils/misc";
import { useDerivedMotionValue } from "@anori/utils/motion/derived-motion.value";
import { usePluginConfigValue } from "@anori/utils/plugins/define";
import type { SomePlugin, SomeWidget } from "@anori/utils/plugins/types";
import { WidgetMetadataContext, type WidgetMetadataContextType } from "@anori/utils/plugins/widget";
import type { Mapping } from "@anori/utils/types";
import { m, type PanInfo, useMotionValue } from "motion/react";
import {
  Component,
  type ComponentProps,
  type ReactNode,
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { css, cva, cx } from "styled-system/css";
import { WidgetCardContext } from "./context";

const EMPTY_CONFIG: Mapping = {};

const cardCss = css({
  position: "relative",
  display: "flex",
  flexDirection: "column",
  bg: "surface",
  color: "text.primary",
  borderRadius: "lg",
  zIndex: "base",
  boxShadow: "surface.edge",
  "&[data-busy]": {
    zIndex: "docked",
    boxShadow: "{shadows.surface.edge}, {shadows.overlay}",
  },
  "& .widget-control": {
    opacity: 0,
    pointerEvents: "none",
    transition: "opacity 0.15s ease-in-out",
  },
  "&:hover .widget-control, &:focus-within .widget-control": {
    opacity: 1,
    pointerEvents: "auto",
  },
  // While dragging or resizing, the only control still mounted is the active one — keep it visible
  // regardless of hover (the pointer may leave the card as it moves). Stay pointer-transparent so a
  // drop target beneath the dragged card (e.g. a sidebar folder) still receives the pointer;
  "&[data-busy] .widget-control": {
    opacity: 1,
    pointerEvents: "none",
  },
  // Resize is a native-pointer gesture on the handle itself (with pointer capture), so it must stay
  // interactive throughout. (No drop-through is needed during a resize.)
  "&[data-resizing] .widget-control": {
    pointerEvents: "auto",
  },
});

const cardPaddedCss = css({ padding: "4" });
const cardFlushCss = css({ padding: 0 });
const overflowProtectionCss = css({
  position: "relative",
  display: "flex",
  flexDirection: "column",
  flexGrow: 1,
  overflow: "hidden",
  textOverflow: "ellipsis",
});
const interactionBlockerCss = css({ position: "absolute", inset: 0 });
const errorDescriptionCss = css({ marginTop: "3" });

const control = cva({
  base: { position: "absolute", zIndex: 1, boxShadow: "raised" },
  variants: {
    position: {
      remove: { top: "-14px", right: "-14px", _compact: { top: "-8px", right: "-4px" } },
      edit: { top: "30px", right: "-14px", _compact: { right: "-4px" } },
      drag: {
        top: "-14px",
        left: "-14px",
        cursor: "grab!",
        touchAction: "none",
        _compact: { top: "-8px", left: "-4px" },
      },
      resize: {
        bottom: "-14px",
        right: "-14px",
        cursor: "grab!",
        touchAction: "none",
        "& svg": { transform: "rotate(90deg)" },
        _compact: { bottom: "-8px", right: "-4px" },
      },
    },
  },
});

const WidgetRenderError = () => (
  <>
    <Heading>Oops</Heading>
    <div className={errorDescriptionCss}>Widget failed to render, check console for details.</div>
  </>
);

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error("Error happened inside widget");
    console.error(error);
  }

  render() {
    if (this.state.hasError) {
      return <WidgetRenderError />;
    }

    return this.props.children;
  }
}

type WidgetCardProps = {
  widget: SomeWidget;
  plugin: SomePlugin;
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
      config: unknown;
      instanceId: string;
      size: GridItemSize;
      position: GridPosition;
      onUpdateConfig: (instanceId: string, config: Partial<Mapping>) => void;
      onRemove?: () => void;
      onEdit?: () => void;
      onResize?: (newWidth: number, newHeight: number) => boolean | undefined;
      onPositionChange?: (newPosition: GridPosition) => void;
      onMoveToFolder?: (folderId: string) => void;
    }
) &
  Omit<ComponentProps<typeof m.div>, "children" | "onDragEnd" | "onResize">;

export const WidgetCard = ({
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
}: WidgetCardProps) => {
  const convertUnitsToPixels = (unit: number) => unit * grid.boxSize - gapSize * 2;

  const convertPixelsToUnits = (px: number) => Math.round((px + gapSize * 2) / grid.boxSize);

  const startResize = (e: ReactPointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    resizeActive.current = true;
    resizeStart.current = { x: e.clientX, y: e.clientY };
    setIsResizing(true);
  };

  const updateResize = (e: ReactPointerEvent<HTMLButtonElement>) => {
    if (!resizeActive.current || !widget.appearance.resizable) return;
    const res = widget.appearance.resizable;
    const minWidth = res === true ? 1 : (res.min?.width ?? 1);
    const minHeight = res === true ? 1 : (res.min?.height ?? 1);
    const maxWidth = res === true ? 999 : (res.max?.width ?? 999);
    const maxHeight = res === true ? 999 : (res.max?.height ?? 999);
    const offsetX = e.clientX - resizeStart.current.x;
    const offsetY = e.clientY - resizeStart.current.y;
    const newWidth = minmax(
      convertUnitsToPixels(sizeToUse.width) + offsetX,
      convertUnitsToPixels(minWidth),
      convertUnitsToPixels(maxWidth),
    );
    const newHeight = minmax(
      convertUnitsToPixels(sizeToUse.height) + offsetY,
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

  const finishResize = (e: ReactPointerEvent<HTMLButtonElement>) => {
    if (!resizeActive.current) return;
    resizeActive.current = false;
    e.currentTarget.releasePointerCapture(e.pointerId);
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

  const { gapSize } = useSizeSettings();
  const { t } = useTranslation();
  const ref = useRef<HTMLDivElement>(null);
  const runAfterRender = useRunAfterNextRender();
  const resizeActive = useRef(false);
  const resizeStart = useRef({ x: 0, y: 0 });

  const sizeToUse = size ? size : widget.appearance.size;
  const withPadding = !widget.appearance.withoutPadding;

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
  const otherWidgetDragging = useCurrentlyDragging({ type: "widget" }) && !isDragging;

  const pixelPosition = position ? positionToPixelPosition({ grid, position }) : { x: 0, y: 0 };

  const { dragControls, elementProps, dragHandleProps } = useDraggable(
    {
      type: "widget",
      id: instanceId || "",
    },
    {
      onDragEnd,
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

  const { config: parsedConfig, failed: configParseFailed } = useMemo(() => {
    if (type === "mock") return { config: EMPTY_CONFIG, failed: false };
    try {
      return { config: widget.decode(config ?? EMPTY_CONFIG), failed: false };
    } catch (e) {
      console.error(`Widget "${widget.id}" failed to decode its config`, e);
      return { config: EMPTY_CONFIG, failed: true };
    }
  }, [type, widget, config]);
  const pluginConfig = usePluginConfigValue(plugin.id, plugin.decodeConfig);

  const children = useMemo(() => {
    if (type === "mock") return <widget.mock />;
    if (configParseFailed) return <WidgetRenderError />;
    return <widget.mainScreen instanceId={instanceId} config={parsedConfig} pluginConfig={pluginConfig} />;
  }, [type, widget, instanceId, configParseFailed, parsedConfig, pluginConfig]);

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
      className={cx(cardCss, withPadding ? cardPaddedCss : cardFlushCss, "WidgetCard", className)}
      data-busy={isDragging || isResizing ? true : undefined}
      data-resizing={isResizing ? true : undefined}
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
        position: type === "widget" ? "absolute" : undefined,
        top: isDragging ? (gridRef.current?.getBoundingClientRect().top ?? 0) + pixelPosition.y : pixelPosition.y,
        left: isDragging ? (gridRef.current?.getBoundingClientRect().left ?? 0) + pixelPosition.x : pixelPosition.x,
        ...style,
      }}
      {...dragProps}
      {...props}
    >
      {isEditing && !otherWidgetDragging && type === "widget" && !isResizing && !!onDragEnd && (
        <IconButton
          className={cx("widget-control", control({ position: "drag" }))}
          icon={builtinIcons.dragHandle}
          label={t("moveWidget")}
          showTooltip={!isDragging}
          onPointerDown={(e) => {
            e.preventDefault();
            setIsDragging(true);
            runAfterRender(() => dragControls.start(e));
          }}
          onPointerUp={() => setIsDragging(false)}
          {...dragHandleProps}
        />
      )}
      {isEditing && !otherWidgetDragging && type === "widget" && !isDragging && !isResizing && !!onRemove && (
        <IconButton
          className={cx("widget-control", control({ position: "remove" }))}
          icon={builtinIcons.close}
          label={t("removeWidget")}
          onClick={onRemove}
        />
      )}
      {isEditing && !otherWidgetDragging && type === "widget" && !isDragging && !isResizing && !!onEdit && (
        <IconButton
          className={cx("widget-control", control({ position: "edit" }))}
          icon={builtinIcons.pencil}
          label={t("editWidget")}
          onClick={onEdit}
        />
      )}
      {isEditing && !otherWidgetDragging && type === "widget" && !isDragging && !!widget.appearance.resizable && (
        <IconButton
          className={cx("widget-control", control({ position: "resize" }))}
          icon={builtinIcons.resize}
          label={t("resizeWidget")}
          showTooltip={!isResizing}
          onPointerDown={startResize}
          onPointerMove={updateResize}
          onPointerUp={finishResize}
        />
      )}
      <ErrorBoundary>
        <div className={overflowProtectionCss} style={{ borderRadius: withPadding ? 0 : "inherit" }}>
          {children}
          {(type === "mock" || isResizing || isDragging) && <div className={interactionBlockerCss} />}
        </div>
      </ErrorBoundary>
    </m.div>
  );

  const cardContextValue = useMemo(() => ({ cardRef: ref }), []);
  const updateConfig = useCallback(
    (newConf: Partial<Mapping>) => onUpdateConfig?.(instanceId ?? "mock", newConf),
    [onUpdateConfig, instanceId],
  );
  const widgetMetadata = useMemo<WidgetMetadataContextType>(
    () => ({
      pluginId: plugin.id,
      widgetId: widget.id,
      instanceId: instanceId ?? "mock",
      size: isResizing ? { width: resizeWidthUnits, height: resizeHeightUnits } : sizeToUse,
      config: parsedConfig,
      updateConfig,
    }),
    [
      plugin.id,
      widget.id,
      instanceId,
      isResizing,
      resizeWidthUnits,
      resizeHeightUnits,
      sizeToUse,
      parsedConfig,
      updateConfig,
    ],
  );

  return (
    <WidgetCardContext.Provider value={cardContextValue}>
      <WidgetMetadataContext.Provider value={widgetMetadata}>
        {isDragging ? createPortal(card, document.body, `card-${instanceId}`) : card}
      </WidgetMetadataContext.Provider>
    </WidgetCardContext.Provider>
  );
};
