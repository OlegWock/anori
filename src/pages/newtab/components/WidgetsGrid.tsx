import { Onboarding } from "@components/Onboarding";
import { MotionScrollArea } from "@components/ScrollArea";
import { WidgetCard } from "@components/WidgetCard";
import { DndItemMeta } from "@utils/drag-and-drop";
import { GridDimensions, Layout, LayoutItem, Position, canPlaceItemInGrid, layoutTo2DArray, positionToPixelPosition, snapToSector, willItemOverlay } from "@utils/grid";
import { WidgetMetadataContext } from "@utils/plugin";
import { AnoriPlugin, WidgetDescriptor, WidgetInFolderWithMeta, WidgetResizable } from "@utils/user-data/types";
import { AnimatePresence, PanInfo, m } from "framer-motion";
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
    const onWidgetDragEnd = async (widget: WidgetInFolderWithMeta<any, any, any>, dest: DndItemMeta | null, event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
        if (dest && dest.type === 'folder') {
            onLayoutUpdate([{ type: 'move-to-folder', instanceId: widget.instanceId, folderId: dest.id }]);
        } else {
            if (!localRef.current) return;
            console.log('tryRepositionWidget', { widget, event, info });
            const mainBox = localRef.current.getBoundingClientRect();
            const relativePoint = {
                x: info.point.x - mainBox.x,
                y: info.point.y - mainBox.y,
            };
            const possibleSnapPoints = snapToSector({ grid: gridDimensions, position: relativePoint });
            console.log('Possible snap points:', possibleSnapPoints);
            const snapPoint = possibleSnapPoints.find(p => {
                return canPlaceItemInGrid({ 
                    grid: gridDimensions, 
                    item: widget, 
                    layout: layout.filter(w => w.instanceId !== widget.instanceId), 
                    position: p.position 
                });
            });
            console.log('Span point selected', snapPoint);
            if (!snapPoint) return;
            onLayoutUpdate([{ type: 'change-position', instanceId: widget.instanceId, newPosition: snapPoint.position }])
        }
    };

    const tryResizeWidget = (widget: WidgetInFolderWithMeta<any, any, any>, width: number, height: number) => {
        console.log('Trying to resize widget', widget, `to ${width}x${height}`);
        const widthInBoxesRaw = (width + (gapSize * 2)) / gridDimensions.boxSize;
        const heightInBoxesRaw = (height + (gapSize * 2)) / gridDimensions.boxSize;
        let widthInBoxesRounded = Math.round(widthInBoxesRaw);
        let heightInBoxesRounded = Math.round(heightInBoxesRaw);
        let widthInBoxesFloored = Math.floor(widthInBoxesRaw);
        let heightInBoxesFloored = Math.floor(heightInBoxesRaw);

        console.log(`In boxes ${widthInBoxesRounded}x${heightInBoxesRounded}`);

        if (widget.x + widthInBoxesRounded > gridDimensions.columns) widthInBoxesRounded = gridDimensions.columns - widget.x;
        if (widget.y + heightInBoxesRounded > gridDimensions.rows) heightInBoxesRounded = gridDimensions.rows - widget.y;
        if (widget.x + widthInBoxesFloored > gridDimensions.columns) widthInBoxesFloored = gridDimensions.columns - widget.x;
        if (widget.y + heightInBoxesFloored > gridDimensions.rows) heightInBoxesFloored = gridDimensions.rows - widget.y;

        const isOverlaysRounded = willItemOverlay({
            arr: layoutTo2DArray({
                grid: gridDimensions,
                layout: layout.filter(w => w.instanceId !== widget.instanceId),
            }),
            item: {
                ...widget,
                width: widthInBoxesRounded,
                height: heightInBoxesRounded,
            }
        });

        if (!isOverlaysRounded) {
            if (widget.width === widthInBoxesRounded && widget.height === heightInBoxesRounded) {
                return false;
            }
            onLayoutUpdate([{
                type: 'resize',
                instanceId: widget.instanceId,
                width: widthInBoxesRounded,
                height: heightInBoxesRounded,
            }]);
            console.log('Resized');
            return true;
        }

        const isOverlaysFloored = willItemOverlay({
            arr: layoutTo2DArray({
                grid: gridDimensions,
                layout: layout.filter(w => w.instanceId !== widget.instanceId),
            }),
            item: {
                ...widget,
                width: widthInBoxesFloored,
                height: heightInBoxesFloored,
            }
        });
        if (!isOverlaysFloored) {
            if (widget.width === widthInBoxesFloored && widget.height === heightInBoxesFloored) {
                return false;
            }
            onLayoutUpdate([{
                type: 'resize',
                instanceId: widget.instanceId,
                width: widthInBoxesFloored,
                height: heightInBoxesFloored,
            }]);
            console.log('Resized floored');
            return true;
        }

        console.log('Not resized');
    };

    const localRef = useRef<HTMLDivElement>(null);
    const combinedRef = mergeRefs([localRef, ref]);

    // TODO: Because we use ScrollArea here (which hides overflow) our current Drag-and-drop implementation looks ugly
    // Because dragged element can't overflow parent. Ideally, we should pop it from layout when we start dragging it
    // Probably, correct solution will be to give all data to WidgetCard and let it calcualte (and thus control) its
    // pixel position in grid. This will allow us to pop it from layout (render in portal) when drag starts
    // This also allows us to adjust widget size (provided in context) dynamically

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
                    const position = positionToPixelPosition({ grid: gridDimensions, positon: { x, y } });
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
                {layout.map((w, i) => {
                    const position = positionToPixelPosition({ grid: gridDimensions, positon: w });
                    const resizable = resizableToPixelSize(w.widget.appearance.resizable, gridDimensions.boxSize, gapSize);


                    return (<WidgetMetadataContext.Provider key={w.instanceId} value={{
                        pluginId: w.pluginId,
                        instanceId: w.instanceId,
                        config: w.configutation,
                        // TODO: would be nice to update this in realtime while user pans widget
                        // So any UI dependencies will rerendered right away
                        size: {
                            width: w.width,
                            height: w.height,
                        },
                        updateConfig: (config) => onUpdateWidgetConfig(w.instanceId, config),
                    }}>
                        <WidgetCard
                            instanceId={w.instanceId}
                            key={w.instanceId}
                            drag
                            onDragEnd={(dest, e, info) => onWidgetDragEnd(w, dest, e, info)}
                            withAnimation={!!w.widget.appearance.withHoverAnimation}
                            withPadding={!w.widget.appearance.withoutPadding}
                            resizable={resizable}
                            onResize={(width, height) => tryResizeWidget(w, width, height)}
                            width={w.width}
                            height={w.height}
                            style={{
                                position: 'absolute',
                                top: position.y,
                                left: position.x,
                            }}
                            onRemove={() => onLayoutUpdate([{ type: 'remove', instanceId: w.instanceId }])}
                            onEdit={w.widget.configurationScreen ? () => onEditWidget(w) : undefined}
                        >
                            <w.widget.mainScreen instanceId={w.instanceId} config={w.configutation} />
                        </WidgetCard>
                    </WidgetMetadataContext.Provider>);
                })}
            </AnimatePresence>
            {showOnboarding && <Onboarding gridDimensions={gridDimensions} />}
        </div>
    </MotionScrollArea>);
});