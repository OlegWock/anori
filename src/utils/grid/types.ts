import type { Mapping } from "@anori/utils/types";

export type GridDimensions = {
  boxSize: number;
  columns: number;
  rows: number;
  minColumns: number;
  minRows: number;
};

export type GridItemSize = {
  width: number;
  height: number;
};

export type GridPosition = {
  x: number;
  y: number;
};

export type GridPixelPosition = {
  x: number;
  y: number;
};

export type GridItem<T extends Mapping = Mapping> = GridPosition & GridItemSize & T;
export type GridContent<T extends Mapping = Mapping> = GridItem<T>[];
