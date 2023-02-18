import { RefObject, useEffect, useLayoutEffect, useState } from "react";
import minBy from 'lodash/minBy';
import sortBy from 'lodash/sortBy';

export type GridDimensions = {
    boxSize: number,
    colums: number,
    rows: number,
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

export const DEFAULT_BOX_SIZE = 180;
export const MIN_BOX_SIZE = 150;
export const DEFAULT_CARD_MARGIN = 16;

export const calculateColumnWidth = (containerWidth: number, desiredSize: number) => {
    const columns = Math.round(containerWidth / desiredSize);
    const colWidth = Math.max(Math.floor(containerWidth / columns), MIN_BOX_SIZE);
    return Number.isNaN(colWidth) ? desiredSize : colWidth;
};

export const useGrid = (ref: RefObject<HTMLElement>, desiredSize: number = DEFAULT_BOX_SIZE) => {
    const [dimensions, setDimensions] = useState<GridDimensions & { position: PixelPosition, pixelSize: LayoutItemSize }>({
        boxSize: desiredSize,
        colums: 0,
        rows: 0,
        position: {
            x: 0,
            y: 0,
        },
        pixelSize: {
            width: 0,
            height: 0,
        }
    });

    useLayoutEffect(() => {
        if (ref.current) {
            const resizeObserver = new ResizeObserver((entries) => {
                if (!ref.current) return;
                const lastRecord = entries[entries.length - 1];
                const { inlineSize: width, blockSize: height } = lastRecord.contentBoxSize[0];
                const boxSize = calculateColumnWidth(width, desiredSize);
                const colums = Math.floor(width / boxSize);
                const rows = Math.floor(height / boxSize);
                // const rows = 3;

                const box = ref.current.getBoundingClientRect();
                const dimensions = {
                    boxSize,
                    colums,
                    rows,
                    position: {
                        x: box.left,
                        y: box.top,
                    },
                    pixelSize: {
                        width: box.width,
                        height: box.height,
                    },
                };

                setDimensions(dimensions);
            });

            resizeObserver.observe(ref.current);
            return () => resizeObserver.disconnect();
        }
    }, [ref.current]);

    return dimensions;
};

export const layoutItemToSectors = (item: LayoutItem) => {
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

export const layoutTo2DArray = ({ grid, layout, allowOverlay = false }: { grid: GridDimensions, layout: Layout<any>, allowOverlay?: boolean }): Grid2DArray => {
    const arr = [...Array(grid.rows)].map(() => {
        return [...Array(grid.colums)].map(() => false);
    });

    for (const item of layout) {
        const itemSectors = layoutItemToSectors(item);
        itemSectors.forEach(s => {
            if (s.x >= grid.colums || s.y >= grid.rows) return;
            if (arr[s.y][s.x] && !allowOverlay) throw new Error('elements in layout have overlay');
            arr[s.y][s.x] = true;
        })
    }

    return arr;
};

export const willItemOverlay = ({ arr, item }: { arr: Grid2DArray, item: LayoutItem }): boolean => {
    const itemSectors = layoutItemToSectors(item);
    for (const sector of itemSectors) {
        if (arr.length <= sector.y || arr[sector.y].length <= sector.x) continue; // Ignore overflow
        if (arr[sector.y][sector.x]) return true;
    }
    return false;
};

export const canFitItemInGrid = ({ grid, layout, item }: { grid: GridDimensions, layout: Layout, item: LayoutItemSize }): false | Position => {
    const arr = layoutTo2DArray({ grid, layout });

    for (let i = 0; i < arr.length; i++) {
        const row = arr[i];
        for (let j = 0; j < row.length; j++) {
            const cell = row[j];
            if (cell) continue;
            const overlay = willItemOverlay({ arr, item: { ...item, x: j, y: i } });
            const overflow = (j + item.width > grid.colums) || (i + item.height > grid.rows);
            if (overlay || overflow) continue;
            
            return { x: j, y: i };
        }
    }

    return false;
};

export const distanceBetweenPoints = (p1: PixelPosition, p2: PixelPosition) => {
    return Math.hypot(p2.x - p1.x, p2.y - p1.y);
};

export const snapToSector = ({ grid, position }: { grid: GridDimensions, position: PixelPosition }) => {
    const possibleSnapPoints = [...Array(grid.rows)].flatMap((_, row) => {
        return [...Array(grid.colums)].map((__, column) => {
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

    return sortBy(possibleSnapPoints, (s) => distanceBetweenPoints(s.pixelPosition, position))!;
};

export const positionToPixelPosition = ({ grid, positon }: { grid: GridDimensions, positon: Position }): PixelPosition => {
    return {
        x: positon.x * grid.boxSize,
        y: positon.y * grid.boxSize,
    };
};

export const fixHorizontalOverflows = <T extends {}>({ grid, layout }: { grid: GridDimensions, layout: Layout<T> }): Layout<T> => {
    let newLayout = [...layout];
    for (const item of layout) {
        const overflow = (item.x + item.width > grid.colums) || (item.y + item.height > grid.rows);
        if (!overflow) continue;
        newLayout = newLayout.filter(i => i !== item);
        const position = canFitItemInGrid({grid, layout: newLayout, item});
        if (position) {
            newLayout.push({
                ...item,
                ...position,
            });
        }
    }
    return newLayout;
};

