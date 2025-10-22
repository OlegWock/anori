import type { GridContent, GridDimensions, GridItemSize, GridPixelPosition } from "@anori/utils/grid/types";
import { calculateColumnWidth } from "@anori/utils/grid/utils";
import isEqual from "lodash/isEqual";
import { type RefObject, useCallback, useLayoutEffect, useState } from "react";

export const useGridDimensions = (
  ref: RefObject<HTMLElement | null>,
  desiredSize: number,
  minSize: number,
  layout: GridContent,
) => {
  const calculateDimensions = useCallback(
    (el: HTMLElement) => {
      const box = el.getBoundingClientRect();
      const scrollWidth = el.scrollWidth;
      const scrollHeight = el.scrollHeight;
      const boxSize = calculateColumnWidth(box.width, desiredSize, minSize);
      const minColumns = Math.floor(box.width / boxSize);
      const minRows = Math.floor(box.height / boxSize);

      const maxColOccupied = Math.max(...layout.map((i) => i.x + i.width));
      const maxRowOccupied = Math.max(...layout.map((i) => i.y + i.height));

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
    },
    [desiredSize, minSize, layout],
  );

  const setDimensions = useCallback(
    (newDimensions: GridDimensions & { position: GridPixelPosition; pixelSize: GridItemSize }) => {
      _setDimensions((prev) => {
        return isEqual(newDimensions, prev) ? prev : newDimensions;
      });
    },
    [],
  );

  const [dimensions, _setDimensions] = useState<
    GridDimensions & { position: GridPixelPosition; pixelSize: GridItemSize }
  >({
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
    },
  });

  useLayoutEffect(() => {
    if (ref.current) {
      setDimensions(calculateDimensions(ref.current));

      const resizeObserver = new ResizeObserver(() => {
        if (!ref.current) return;
        const dimensions = calculateDimensions(ref.current);
        setDimensions(dimensions);
      });

      resizeObserver.observe(ref.current);
      return () => resizeObserver.disconnect();
    }
  }, [ref.current, calculateDimensions, setDimensions]);

  return dimensions;
};
