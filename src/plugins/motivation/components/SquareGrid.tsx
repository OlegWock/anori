import { useElementSize } from "@anori/utils/hooks";
import { type CSSProperties, useMemo, useState } from "react";
import { css, cva, cx } from "styled-system/css";

const container = css({
  flexGrow: 1,
  minHeight: 0,
  minWidth: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
});
const grid = css({ display: "grid", justifyContent: "center", alignContent: "center" });
const square = cva({
  base: { borderRadius: "var(--square-radius)" },
  variants: {
    state: {
      filled: { bg: "accent" },
      current: {
        backgroundImage: "linear-gradient(to right, token(colors.accent) var(--fill), token(colors.track) var(--fill))",
        _rtl: {
          backgroundImage:
            "linear-gradient(to left, token(colors.accent) var(--fill), token(colors.track) var(--fill))",
        },
      },
      empty: { bg: "track" },
    },
  },
});

export type SquareGridProps = {
  total: number;
  filled: number;
  partial: number;
  className?: string;
};

type Layout = { columns: number; cell: number; gap: number };

const computeLayout = (total: number, width: number, height: number): Layout | null => {
  if (total <= 0 || width <= 0 || height <= 0) return null;
  const columns = Math.ceil(Math.sqrt(total));
  const gap = Math.min(width, height) / columns < 9 ? 1 : 3;
  const cell = Math.floor((Math.min(width, height) - gap * (columns - 1)) / columns);
  return cell >= 1 ? { columns, cell, gap } : null;
};

export const SquareGrid = ({ total, filled, partial, className }: SquareGridProps) => {
  const [element, setElement] = useState<HTMLDivElement | null>(null);
  const { width, height } = useElementSize(element);
  const layout = useMemo(() => computeLayout(total, width, height), [total, width, height]);

  const squares = useMemo(() => {
    if (!layout) return null;
    return Array.from({ length: total }, (_, index) => {
      const state = index < filled ? "filled" : index === filled && partial > 0 ? "current" : "empty";
      return <div key={index} className={square({ state })} />;
    });
  }, [layout, total, filled, partial]);

  const style = layout
    ? ({
        gridTemplateColumns: `repeat(${layout.columns}, ${layout.cell}px)`,
        gridAutoRows: `${layout.cell}px`,
        gap: `${layout.gap}px`,
        "--fill": `${Math.round(partial * 100)}%`,
        "--square-radius": layout.cell >= 8 ? "2px" : "0px",
      } as CSSProperties)
    : undefined;

  return (
    <div ref={setElement} className={cx(container, className)}>
      {layout && (
        <div className={grid} style={style}>
          {squares}
        </div>
      )}
    </div>
  );
};
