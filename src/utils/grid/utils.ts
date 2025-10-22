import type {
  GridContent,
  GridDimensions,
  GridItem,
  GridItemSize,
  GridPixelPosition,
  GridPosition,
} from "@anori/utils/grid/types";
import type { Mapping } from "@anori/utils/types";

type Grid2DArray = boolean[][];

export class OverlapError extends Error {
  constructor() {
    super("Elements in the layout have overlap");
    this.name = "ValidationError";
  }
}

export const calculateColumnWidth = (containerWidth: number, desiredSize: number, minBoxSize: number) => {
  const columns = Math.round(containerWidth / desiredSize);
  const colWidth = Math.min(Math.max(Math.floor(containerWidth / columns), minBoxSize), desiredSize);
  return Number.isNaN(colWidth) ? desiredSize : colWidth;
};

const layoutItemToSectors = (item: GridItem<Mapping>) => {
  const arr: GridPosition[] = [];
  for (let i = item.x; i < item.x + item.width; i++) {
    for (let j = item.y; j < item.y + item.height; j++) {
      arr.push({
        x: i,
        y: j,
      });
    }
  }

  return arr;
};

export const layoutTo2DArray = ({
  grid,
  layout,
  allowOverlay = false,
}: { grid: Pick<GridDimensions, "columns" | "rows">; layout: GridContent; allowOverlay?: boolean }): Grid2DArray => {
  const arr = [...Array(grid.rows)].map(() => {
    return [...Array(grid.columns)].map(() => false);
  });

  for (const item of layout) {
    const itemSectors = layoutItemToSectors(item);
    itemSectors.forEach((s) => {
      if (s.x >= grid.columns || s.y >= grid.rows) return;
      if (arr[s.y][s.x] && !allowOverlay) {
        console.log("Item:", item);
        throw new OverlapError();
      }
      arr[s.y][s.x] = true;
    });
  }

  return arr;
};

export const willItemOverlay = ({ arr, item }: { arr: Grid2DArray; item: GridItem<Mapping> }): boolean => {
  const itemSectors = layoutItemToSectors(item);
  for (const sector of itemSectors) {
    if (arr.length <= sector.y || arr[sector.y].length <= sector.x) continue; // Ignore overflow
    if (arr[sector.y][sector.x]) return true;
  }
  return false;
};

export const canPlaceItemInGrid = ({
  grid,
  layout,
  item,
  position,
  allowOutOfBounds = false,
}: {
  grid: GridDimensions;
  layout: GridContent;
  item: GridItemSize;
  position: GridPosition;
  allowOutOfBounds?: boolean;
}): boolean => {
  const outOfBounds = position.x + item.width > grid.columns || position.y + item.height > grid.rows;
  if (outOfBounds && !allowOutOfBounds) return false;

  const arr = layoutTo2DArray({ grid, layout });
  if (willItemOverlay({ arr, item: { ...item, ...position } })) return false;

  return true;
};

export const findPositionForItemInGrid = ({
  grid,
  layout,
  item,
}: { grid: Pick<GridDimensions, "columns" | "rows">; layout: GridContent; item: GridItemSize }):
  | false
  | GridPosition => {
  const arr = layoutTo2DArray({ grid, layout });

  for (let i = 0; i < arr.length; i++) {
    const row = arr[i];
    for (let j = 0; j < row.length; j++) {
      const cell = row[j];
      if (cell) continue;
      const overlay = willItemOverlay({ arr, item: { ...item, x: j, y: i } });
      const overflow = j + item.width > grid.columns || i + item.height > grid.rows;
      if (overlay || overflow) continue;

      return { x: j, y: i };
    }
  }

  return false;
};

const distanceBetweenPoints = (p1: GridPixelPosition, p2: GridPixelPosition) => {
  return Math.hypot(p2.x - p1.x, p2.y - p1.y);
};

export const snapToSector = ({ grid, position }: { grid: GridDimensions; position: GridPixelPosition }) => {
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
        },
      };
    });
  });

  return possibleSnapPoints.sort((a, b) => {
    return distanceBetweenPoints(a.pixelPosition, position) - distanceBetweenPoints(b.pixelPosition, position);
  });
};

export const positionToPixelPosition = ({
  grid,
  position,
}: { grid: GridDimensions; position: GridPosition }): GridPixelPosition => {
  return {
    x: position.x * grid.boxSize,
    y: position.y * grid.boxSize,
  };
};
