import { builtinIcons } from "@anori/design-system/components/Icon/builtin-icons";
import { IconButton } from "@anori/design-system/components/IconButton/IconButton";
import { useSizeSettings } from "@anori/utils/compact";
import { useWidgetDragActive, type WidgetDragData } from "@anori/utils/dnd";
import { useParentFolder } from "@anori/utils/FolderContentContext";
import type { GridItemSize, GridPosition } from "@anori/utils/grid/types";
import { positionToPixelPosition } from "@anori/utils/grid/utils";
import { usePluginConfigValue } from "@anori/utils/plugins/define";
import type { SomePlugin, SomeWidget } from "@anori/utils/plugins/types";
import { WidgetMetadataContext, type WidgetMetadataContextType } from "@anori/utils/plugins/widget";
import type { Mapping } from "@anori/utils/types";
import { useDraggable } from "@dnd-kit/react";
import { m } from "motion/react";
import { type ComponentProps, type Ref, useCallback, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import { mergeRefs } from "react-merge-refs";
import { css, cva, cx } from "styled-system/css";
import { WidgetCardContext } from "./context";
import { useWidgetResize } from "./use-widget-resize";
import { WidgetErrorBoundary, WidgetRenderError } from "./WidgetErrorBoundary";

const EMPTY_CONFIG: Mapping = {};

const positionSpring = { type: "spring", duration: 0.25, bounce: 0.1 } as const;

const cardCss = css({
  position: "relative",
  display: "flex",
  flexDirection: "column",
  bg: "surface",
  color: "text.primary",
  borderRadius: "lg",
  zIndex: "base",
  boxShadow: "surface.edge",
  backfaceVisibility: "hidden",
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
        _nestedSvgIcon: { transform: "rotate(90deg)" },
        _compact: { bottom: "-8px", right: "-4px" },
      },
    },
  },
});

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
      onResizePreview?: undefined;
      onPositionChange?: undefined;
      onMoveToFolder?: undefined;
      dragSnapPosition?: undefined;
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
      onResizePreview?: (size: GridItemSize | null) => void;
      onPositionChange?: (newPosition: GridPosition) => void;
      onMoveToFolder?: (folderId: string) => void;
      dragSnapPosition?: GridPosition;
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
  onResizePreview,
  onPositionChange,
  onMoveToFolder,
  dragSnapPosition,
  ...props
}: WidgetCardProps) => {
  const { isEditing, grid } = useParentFolder();
  const { gapSize } = useSizeSettings();
  const { t } = useTranslation();
  const ref = useRef<HTMLDivElement>(null);

  const sizeToUse = size ? size : widget.appearance.size;
  const withPadding = !widget.appearance.withoutPadding;

  const resize = useWidgetResize({
    resizable: widget.appearance.resizable,
    size: sizeToUse,
    position,
    cardRef: ref,
    onResize,
    onResizePreview,
  });

  const activePosition = dragSnapPosition ?? position;
  const pixelPosition = activePosition ? positionToPixelPosition({ grid, position: activePosition }) : { x: 0, y: 0 };

  const dragData: WidgetDragData = {
    onDropToFolder: (folderId) => {
      onMoveToFolder?.(folderId);
    },
  };

  const {
    ref: draggableRef,
    handleRef,
    isDragSource: isDragging,
  } = useDraggable({
    id: instanceId ?? `mock-${widget.id}`,
    type: "widget",
    disabled: type !== "widget" || !isEditing,
    data: dragData,
  });
  const widgetDragActive = useWidgetDragActive();
  const otherWidgetDragging = widgetDragActive && !isDragging;

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

  const card = (
    <m.div
      id={instanceId ? `WidgetCard-${instanceId}` : undefined}
      ref={mergeRefs([ref, draggableRef as Ref<HTMLDivElement>])}
      key={`card-${instanceId}`}
      className={cx(cardCss, withPadding ? cardPaddedCss : cardFlushCss, "WidgetCard", className)}
      data-busy={isDragging || resize.isResizing ? true : undefined}
      data-resizing={resize.isResizing ? true : undefined}
      transition={{ ease: "easeInOut", duration: 0.15, top: positionSpring, left: positionSpring }}
      initial={false}
      animate={
        type === "widget" && !isDragging
          ? { top: pixelPosition.y + gapSize, left: pixelPosition.x + gapSize }
          : undefined
      }
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
        width: resize.width,
        height: resize.height,
        position: type === "widget" ? "absolute" : undefined,
        ...(type === "widget" && isDragging ? { top: pixelPosition.y + gapSize, left: pixelPosition.x + gapSize } : {}),
        ...style,
      }}
      {...props}
    >
      {isEditing && !otherWidgetDragging && type === "widget" && !resize.isResizing && !!onPositionChange && (
        <IconButton
          ref={handleRef}
          className={cx("widget-control", control({ position: "drag" }))}
          icon={builtinIcons.dragHandle}
          label={t("moveWidget")}
          showTooltip={!isDragging}
        />
      )}
      {isEditing && !otherWidgetDragging && type === "widget" && !isDragging && !resize.isResizing && !!onRemove && (
        <IconButton
          className={cx("widget-control", control({ position: "remove" }))}
          icon={builtinIcons.close}
          label={t("removeWidget")}
          onClick={onRemove}
        />
      )}
      {isEditing && !otherWidgetDragging && type === "widget" && !isDragging && !resize.isResizing && !!onEdit && (
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
          showTooltip={!resize.isResizing}
          {...resize.handleProps}
        />
      )}
      <WidgetErrorBoundary>
        <div className={overflowProtectionCss} style={{ borderRadius: withPadding ? 0 : "inherit" }}>
          {children}
          {(type === "mock" || resize.isResizing || widgetDragActive) && <div className={interactionBlockerCss} />}
        </div>
      </WidgetErrorBoundary>
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
      size: resize.isResizing ? { width: resize.widthUnits, height: resize.heightUnits } : sizeToUse,
      config: parsedConfig,
      updateConfig,
    }),
    [
      plugin.id,
      widget.id,
      instanceId,
      resize.isResizing,
      resize.widthUnits,
      resize.heightUnits,
      sizeToUse,
      parsedConfig,
      updateConfig,
    ],
  );

  return (
    <WidgetCardContext.Provider value={cardContextValue}>
      <WidgetMetadataContext.Provider value={widgetMetadata}>{card}</WidgetMetadataContext.Provider>
    </WidgetCardContext.Provider>
  );
};
