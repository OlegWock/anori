import { RefObject, useLayoutEffect, useState } from "react";
import { useMirrorStateToRef } from "./hooks";

export type GridDimensions = {
    boxSize: number,
    columns: number,
    rows: number,
    minColumns: number,
    minRows: number,
};

export type LayoutItemSize = {
    width: number,
    height: number,
};

export type Position = {
    x: number,
    y: number,
};

export type PixelPosition = {
    x: number,
    y: number,
};

export type LayoutItem<T extends {} = {}> = Position & LayoutItemSize & T;
export type Layout<T extends {} = {}> = LayoutItem<T>[];

type Grid2DArray = boolean[][];

export class OverlapError extends Error {
    constructor() {
        super('Elements in the layout have overlap');
        this.name = "ValidationError";
    }
}

export const calculateColumnWidth = (containerWidth: number, desiredSize: number, minBoxSize: number) => {
    const columns = Math.round(containerWidth / desiredSize);
    const colWidth = Math.min(Math.max(Math.floor(containerWidth / columns), minBoxSize), desiredSize);
    return Number.isNaN(colWidth) ? desiredSize : colWidth;
};

export const useGrid = (ref: RefObject<HTMLElement>, desiredSize: number, minSize: number, layout: Layout) => {
    const calculateDimensions = (el: HTMLElement) => {
        const box = el.getBoundingClientRect();
        const scrollWidth = el.scrollWidth;
        const scrollHeight = el.scrollHeight;
        const boxSize = calculateColumnWidth(box.width, desiredSize, minSize);
        const minColumns = Math.floor(box.width / boxSize);
        const minRows = Math.floor(box.height / boxSize);

        const maxColOccupied = Math.max(...layout.map(i => i.x + i.width));
        const maxRowOccupied = Math.max(...layout.map(i => i.y + i.height));

        const columns = Math.max(minColumns, maxColOccupied);
        const rows = Math.max(minRows, maxRowOccupied);

        return {
            boxSize,
            columns,
            rows,
            minColumns,
            minRows,
            position: {
                x: box.left,
                y: box.top,
            },
            pixelSize: {
                width: scrollWidth,
                height: scrollHeight,
            },
        };
    };

    const setDimensions = (newDimensions: GridDimensions & { position: PixelPosition, pixelSize: LayoutItemSize }) => {
        if (
            newDimensions.boxSize !== dimensionsRef.current.boxSize
            || newDimensions.columns !== dimensionsRef.current.columns
            || newDimensions.rows !== dimensionsRef.current.rows
            || newDimensions.minColumns !== dimensionsRef.current.minColumns
            || newDimensions.minRows !== dimensionsRef.current.minRows
            || newDimensions.position.x !== dimensionsRef.current.position.x
            || newDimensions.position.y !== dimensionsRef.current.position.y
            || newDimensions.pixelSize.width !== dimensionsRef.current.pixelSize.width
            || newDimensions.pixelSize.height !== dimensionsRef.current.pixelSize.height
        ) {
            _setDimensions(newDimensions);
        }
    };

    const [dimensions, _setDimensions] = useState<GridDimensions & { position: PixelPosition, pixelSize: LayoutItemSize }>({
        boxSize: desiredSize,
        columns: 0,
        rows: 0,
        minColumns: 0,
        minRows: 0,
        position: {
            x: 0,
            y: 0,
        },
        pixelSize: {
            width: 0,
            height: 0,
        }
    });
    const dimensionsRef = useMirrorStateToRef(dimensions);

    useLayoutEffect(() => {
        if (ref.current) {
            setDimensions(calculateDimensions(ref.current));

            const resizeObserver = new ResizeObserver((entries) => {
                if (!ref.current) return;
                const dimensions = calculateDimensions(ref.current);
                setDimensions(dimensions);
            });

            resizeObserver.observe(ref.current);
            return () => resizeObserver.disconnect();
        }
    }, [ref.current, desiredSize, layout, minSize]);

    return dimensions;
};

const layoutItemToSectors = (item: LayoutItem) => {
    const arr: Position[] = [];
    for (let i = item.x; i < item.x + item.width; i++) {
        for (let j = item.y; j < item.y + item.height; j++) {
            arr.push({
                x: i,
                y: j
            });
        }
    }

    return arr;
}

export const layoutTo2DArray = ({ grid, layout, allowOverlay = false }: { grid: Pick<GridDimensions, 'columns' | 'rows'>, layout: Layout<any>, allowOverlay?: boolean }): Grid2DArray => {
    const arr = [...Array(grid.rows)].map(() => {
        return [...Array(grid.columns)].map(() => false);
    });

    for (const item of layout) {
        const itemSectors = layoutItemToSectors(item);
        itemSectors.forEach(s => {
            if (s.x >= grid.columns || s.y >= grid.rows) return;
            if (arr[s.y][s.x] && !allowOverlay) {
                console.log('Item:', item);
                throw new OverlapError();
            }
            arr[s.y][s.x] = true;
        })
    }

    return arr;
};

export const findOverlapItems = <T extends {}>(layout: Layout<T>): LayoutItem<T>[] => {
    const overlapItems: LayoutItem<T>[] = [];
    const arr: boolean[][] = [];
    for (const item of layout) {
        const itemSectors = layoutItemToSectors(item);
        for (const s of itemSectors) {
            if (!arr[s.y]) arr[s.y] = [];
            if (arr[s.y][s.x]) {
                overlapItems.push(item);
                break;
            }
            arr[s.y][s.x] = true;
        }
    }
    return overlapItems;
};

export const willItemOverlay = ({ arr, item }: { arr: Grid2DArray, item: LayoutItem }): boolean => {
    const itemSectors = layoutItemToSectors(item);
    for (const sector of itemSectors) {
        if (arr.length <= sector.y || arr[sector.y].length <= sector.x) continue; // Ignore overflow
        if (arr[sector.y][sector.x]) return true;
    }
    return false;
};

export const canPlaceItemInGrid = ({ grid, layout, item, position, allowOutOfBounds = false }: { grid: GridDimensions, layout: Layout, item: LayoutItemSize, position: Position, allowOutOfBounds?: boolean }): boolean => {
    const outOfBounds = (position.x + item.width > grid.columns) || (position.y + item.height > grid.rows);
    if (outOfBounds && !allowOutOfBounds) return false;

    const arr = layoutTo2DArray({ grid, layout });
    if (willItemOverlay({ arr, item: { ...item, ...position } })) return false;

    return true;
};

export const findPositionForItemInGrid = ({ grid, layout, item }: { grid: Pick<GridDimensions, 'columns' | 'rows'>, layout: Layout, item: LayoutItemSize }): false | Position => {
    const arr = layoutTo2DArray({ grid, layout });

    for (let i = 0; i < arr.length; i++) {
        const row = arr[i];
        for (let j = 0; j < row.length; j++) {
            const cell = row[j];
            if (cell) continue;
            const overlay = willItemOverlay({ arr, item: { ...item, x: j, y: i } });
            const overflow = (j + item.width > grid.columns) || (i + item.height > grid.rows);
            if (overlay || overflow) continue;

            return { x: j, y: i };
        }
    }

    return false;
};

const distanceBetweenPoints = (p1: PixelPosition, p2: PixelPosition) => {
    return Math.hypot(p2.x - p1.x, p2.y - p1.y);
};

export const snapToSector = ({ grid, position }: { grid: GridDimensions, position: PixelPosition }) => {
    const possibleSnapPoints = [...Array(grid.rows)].flatMap((_, row) => {
        return [...Array(grid.columns)].map((__, column) => {
            return {
                pixelPosition: {
                    x: column * grid.boxSize,
                    y: row * grid.boxSize,
                },
                position: {
                    x: column,
                    y: row,
                }
            };
        });
    });

    return possibleSnapPoints.sort((a, b) => {
        return distanceBetweenPoints(a.pixelPosition, position) - distanceBetweenPoints(b.pixelPosition, position)
    });
};

export const positionToPixelPosition = ({ grid, position }: { grid: GridDimensions, position: Position }): PixelPosition => {
    return {
        x: position.x * grid.boxSize,
        y: position.y * grid.boxSize,
    };
};


