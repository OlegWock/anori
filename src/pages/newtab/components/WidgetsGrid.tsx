import { Onboarding } from "@components/Onboarding";
import { MotionScrollArea } from "@components/ScrollArea";
import { WidgetCard } from "@components/WidgetCard";
import { GridDimensions, Layout, LayoutItem, Position, canPlaceItemInGrid, layoutTo2DArray, positionToPixelPosition, willItemOverlay } from "@utils/grid";
import { AnoriPlugin, WidgetDescriptor, WidgetInFolderWithMeta, WidgetResizable } from "@utils/user-data/types";
import { AnimatePresence, m } from "framer-motion";
import { forwardRef, useRef } from "react";
import { mergeRefs } from "react-merge-refs";


type LayoutArg = {
    pluginId: string;
    widgetId: string;
    instanceId: string;
    configutation: any;
} & {
    plugin: AnoriPlugin<any, any>;
    widget: WidgetDescriptor<any>;
};

export type LayoutChange = {
    type: 'change-position',
    instanceId: string,
    newPosition: Position,
} | {
    type: 'move-to-folder',
    instanceId: string,
    folderId: string,
} | {
    type: 'remove',
    instanceId: string,
} | {
    type: 'resize',
    instanceId: string,
    width: number,
    height: number,
};

export type WidgetsGridProps = {
    isEditing: boolean,
    gridDimensions: GridDimensions,
    gapSize: number,
    layout: Layout<LayoutArg>,
    onEditWidget: (w: LayoutItem<LayoutArg>) => void,
    onUpdateWidgetConfig: (instaceId: string, config: Partial<{}>) => void,
    onLayoutUpdate?: (changes: LayoutChange[]) => void,
    showOnboarding?: boolean,
};

const resizableToPixelSize = (res: WidgetResizable, boxSize: number, gap: number) => {
    const calcWithGaps = (boxes: number) => {
        return (boxSize * boxes) - (gap * 2);
    };

    if (!res) return false;
    if (res === true) {
        return {
            min: {
                width: boxSize,
                height: boxSize,
            },
            max: {
                width: 9999,
                height: 9999,
            }
        }
    }
    return {
        min: {
            width: res.min ? calcWithGaps(res.min.width) : calcWithGaps(1),
            height: res.min ? calcWithGaps(res.min.height) : calcWithGaps(1),
        },
        max: {
            width: res.max ? calcWithGaps(res.max.width) : 9999,
            height: res.max ? calcWithGaps(res.max.height) : 9999,
        }
    }

};

export const WidgetsGrid = forwardRef<HTMLDivElement, WidgetsGridProps>(({
    isEditing, gridDimensions, gapSize, layout, onUpdateWidgetConfig, onEditWidget, showOnboarding, onLayoutUpdate = () => { },
}, ref) => {
    const tryRepositionWidget = (widget: WidgetInFolderWithMeta<any, any, any>, position: Position) => {
        const canPlaceThere = canPlaceItemInGrid({
            grid: gridDimensions,
            item: widget,
            layout: layout.filter(w => w.instanceId !== widget.instanceId),
            position,
        });
        if (canPlaceThere) {
            onLayoutUpdate([{ type: 'change-position', instanceId: widget.instanceId, newPosition: position }])
        }
    };

    const tryResizeWidget = (widget: WidgetInFolderWithMeta<any, any, any>, widthInBoxes: number, heightInBoxes: number) => {
        console.log('Trying to resize widget', widget, `to ${widthInBoxes}x${heightInBoxes}`);

        if (widget.x + widthInBoxes > gridDimensions.columns) widthInBoxes = gridDimensions.columns - widget.x;
        if (widget.y + heightInBoxes > gridDimensions.rows) heightInBoxes = gridDimensions.rows - widget.y;

        const isOverlays = willItemOverlay({
            arr: layoutTo2DArray({
                grid: gridDimensions,
                layout: layout.filter(w => w.instanceId !== widget.instanceId),
            }),
            item: {
                ...widget,
                width: widthInBoxes,
                height: heightInBoxes,
            }
        });

        if (!isOverlays) {
            if (widget.width === widthInBoxes && widget.height === heightInBoxes) {
                return false;
            }
            onLayoutUpdate([{
                type: 'resize',
                instanceId: widget.instanceId,
                width: widthInBoxes,
                height: heightInBoxes,
            }]);
            console.log('Resized');
            return true;
        }

        console.log('Not resized');
        return false;
    };

    const gridRef = useRef<HTMLDivElement>(null);
    const combinedRef = mergeRefs([gridRef, ref]);

    return (<MotionScrollArea
        className="WidgetsGrid"
        contentClassName="WidgetsGrid-viewport"
        layout
        layoutRoot
        direction="both"
        type="hover"
        color="translucent"
    >
        <div className="widgets-relative-wrapper" ref={combinedRef}>
            <AnimatePresence>
                {isEditing && new Array(gridDimensions.columns * gridDimensions.rows).fill(null).map((_, i) => {
                    const x = i % gridDimensions.columns;
                    const y = Math.floor(i / gridDimensions.columns);
                    const position = positionToPixelPosition({ grid: gridDimensions, position: { x, y } });
                    return (<m.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.18 }}
                        key={`${x}_${y}`}
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            y: position.y,
                            x: position.x,
                            margin: gapSize,
                            width: gridDimensions.boxSize - gapSize * 2,
                            height: gridDimensions.boxSize - gapSize * 2,
                            background: 'rgba(255, 255, 255, 0.15)',
                            borderRadius: 12,
                            userSelect: 'none',
                            WebkitUserSelect: 'none',
                            pointerEvents: 'none',
                        }}
                    />);
                })}
            </AnimatePresence>

            <AnimatePresence initial={false}>
                {gridDimensions.minColumns !== 0 && layout.map((w, i) => {
                    return (<WidgetCard
                        type="widget"
                        widget={w.widget}
                        plugin={w.plugin}
                        instanceId={w.instanceId}
                        config={w.configutation}
                        key={w.instanceId}
                        size={w}
                        position={w}
                        onUpdateConfig={conf => onUpdateWidgetConfig(w.instanceId, conf)}
                        onRemove={() => onLayoutUpdate([{ type: 'remove', instanceId: w.instanceId }])}
                        onEdit={w.widget.configurationScreen ? () => onEditWidget(w) : undefined}
                        onResize={(width, height) => tryResizeWidget(w, width, height)}
                        onMoveToFolder={(folderId) => onLayoutUpdate([{ type: 'move-to-folder', instanceId: w.instanceId, folderId: folderId }])}
                        onPositionChange={(p) => tryRepositionWidget(w, p)}
                    />);
                })}
            </AnimatePresence>
            {showOnboarding && <Onboarding gridDimensions={gridDimensions} />}
        </div>
    </MotionScrollArea>);
});