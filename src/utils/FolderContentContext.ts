import { type RefObject, createContext, useContext } from "react";
import type { GridDimensions, LayoutItemSize, PixelPosition } from "./grid";
import { type Folder, homeFolder } from "./user-data/types";

type FolderContentContextType = {
  activeFolder: Folder;
  isEditing: boolean;
  gridRef: RefObject<HTMLDivElement | null>;
  grid: GridDimensions & {
    position: PixelPosition;
    pixelSize: LayoutItemSize;
  };
};

export const FolderContentContext = createContext<FolderContentContextType>({
  activeFolder: homeFolder,
  isEditing: false,
  gridRef: { current: null },
  grid: {
    boxSize: 180,
    columns: 10,
    rows: 5,
    minColumns: 10,
    minRows: 5,
    position: {
      x: 0,
      y: 0,
    },
    pixelSize: {
      width: 1000,
      height: 500,
    },
  },
});

export const useParentFolder = () => {
  return useContext(FolderContentContext);
};
