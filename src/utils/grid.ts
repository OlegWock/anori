import { RefObject, useLayoutEffect, useState } from "react";

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

export const calculateColumnWidth = (containerWidth: number, desiredSize: number) => {
    const minBoxSize = desiredSize * 0.85;
    const columns = Math.round(containerWidth / desiredSize);
    const colWidth = Math.max(Math.floor(containerWidth / columns), minBoxSize);
    return Number.isNaN(colWidth) ? desiredSize : colWidth;
};

export const useGrid = (ref: RefObject<HTMLElement>, desiredSize: number) => {
    const calculateDimensions = () => {
        const box = ref.current!.getBoundingClientRect();
        const boxSize = calculateColumnWidth(box.width, desiredSize);
        const colums = Math.floor(box.width / boxSize);
        const rows = Math.floor(box.height / boxSize);

        return {
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
    };

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
                const dimensions = calculateDimensions();
                setDimensions(dimensions);
            });

            resizeObserver.observe(ref.current);
            return () => resizeObserver.disconnect();
        }
    }, [ref.current, desiredSize]);

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

    return possibleSnapPoints.sort((a, b) => {
        return distanceBetweenPoints(a.pixelPosition, position) - distanceBetweenPoints(b.pixelPosition, position)
    });
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
        const position = canFitItemInGrid({ grid, layout: newLayout, item });
        if (position) {
            newLayout.push({
                ...item,
                ...position,
            });
        }
    }
    return newLayout;
};

