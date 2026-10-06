import { Tooltip } from "@anori/design-system/components/Tooltip/Tooltip";
import { useElementSize } from "@anori/utils/hooks";
import { useState } from "react";
import { css } from "styled-system/css";

const RADIUS = 42;
const STROKE = 13;
const OUTER = RADIUS + STROKE / 2;
const INNER = RADIUS - STROKE / 2;
const CORNER = STROKE * 0.3;
const GAP_DEGREES = 7;
const MIN_ARC_DEGREES = 2;

const toRadians = (angle: number) => ((angle - 90) * Math.PI) / 180;
const polar = (radius: number, angle: number): string => {
  const rad = toRadians(angle);
  return `${(50 + radius * Math.cos(rad)).toFixed(3)} ${(50 + radius * Math.sin(rad)).toFixed(3)}`;
};
const degreesForArcLength = (length: number, radius: number) => (length / radius) * (180 / Math.PI);

const ringPath = (): string => {
  const outer = `M ${polar(OUTER, 0)} A ${OUTER} ${OUTER} 0 1 1 ${polar(OUTER, 180)} A ${OUTER} ${OUTER} 0 1 1 ${polar(OUTER, 0)}`;
  const inner = `M ${polar(INNER, 0)} A ${INNER} ${INNER} 0 1 0 ${polar(INNER, 180)} A ${INNER} ${INNER} 0 1 0 ${polar(INNER, 0)}`;
  return `${outer} ${inner} Z`;
};

const sectorPath = (start: number, end: number): string => {
  if (end - start >= 359.99) return ringPath();
  const outerInset = degreesForArcLength(CORNER, OUTER);
  const innerInset = degreesForArcLength(CORNER, INNER);
  const corner = Math.min(CORNER, ((end - start) / 2 / Math.max(outerInset, innerInset)) * CORNER);
  const oi = degreesForArcLength(corner, OUTER);
  const ii = degreesForArcLength(corner, INNER);
  const outerLargeArc = end - start - 2 * oi > 180 ? 1 : 0;
  const innerLargeArc = end - start - 2 * ii > 180 ? 1 : 0;
  return [
    `M ${polar(OUTER, start + oi)}`,
    `A ${OUTER} ${OUTER} 0 ${outerLargeArc} 1 ${polar(OUTER, end - oi)}`,
    `A ${corner} ${corner} 0 0 1 ${polar(OUTER - corner, end)}`,
    `L ${polar(INNER + corner, end)}`,
    `A ${corner} ${corner} 0 0 1 ${polar(INNER, end - ii)}`,
    `A ${INNER} ${INNER} 0 ${innerLargeArc} 0 ${polar(INNER, start + ii)}`,
    `A ${corner} ${corner} 0 0 1 ${polar(INNER + corner, start)}`,
    `L ${polar(OUTER - corner, start)}`,
    `A ${corner} ${corner} 0 0 1 ${polar(OUTER, start + oi)}`,
    "Z",
  ].join(" ");
};

const container = css({
  flexGrow: 1,
  minHeight: 0,
  minWidth: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
});
const square = css({ position: "relative", flexShrink: 0 });
const svg = css({ display: "block", width: "100%", height: "100%", overflow: "visible" });
const elapsedSector = css({ fill: "accent", transition: "opacity 0.15s ease", _hover: { opacity: 0.85 } });
const remainingSector = css({ fill: "track", transition: "opacity 0.15s ease", _hover: { opacity: 0.8 } });
const center = css({
  position: "absolute",
  inset: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  pointerEvents: "none",
  textAlign: "center",
  fontSize: "calc(0.85rem + var(--widget-box-percent, 0.5) * 0.35rem)",
  fontWeight: "medium",
  lineHeight: "tight",
});
const centerLabel = css({
  maxWidth: "100%",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  textAlign: "start",
});

export type DonutChartProps = {
  fraction: number;
  label: string;
  elapsedTooltip: string;
  remainingTooltip: string;
};

export const DonutChart = ({ fraction, label, elapsedTooltip, remainingTooltip }: DonutChartProps) => {
  const [element, setElement] = useState<HTMLDivElement | null>(null);
  const { width, height } = useElementSize(element);
  const side = Math.max(0, Math.min(width, height));
  const elapsedDegrees = Math.min(360, Math.max(0, fraction * 360));
  const showElapsed = elapsedDegrees > 0.5;
  const showRemaining = elapsedDegrees < 359.5;
  const gap = showElapsed && showRemaining ? GAP_DEGREES : 0;
  const minSplit = gap + MIN_ARC_DEGREES;
  const split = Math.min(360 - minSplit, Math.max(minSplit, elapsedDegrees));
  const elapsedEnd = split - gap / 2;
  const remainingStart = split + gap / 2;

  return (
    <div ref={setElement} className={container}>
      <div className={square} style={{ width: side, height: side }}>
        <svg viewBox="0 0 100 100" className={svg} role="img" aria-label={label}>
          {showElapsed && (
            <Tooltip label={elapsedTooltip} placement="top">
              <path d={sectorPath(gap / 2, elapsedEnd)} className={elapsedSector} fillRule="evenodd" />
            </Tooltip>
          )}
          {showRemaining && (
            <Tooltip label={remainingTooltip} placement="top">
              <path d={sectorPath(remainingStart, 360 - gap / 2)} className={remainingSector} fillRule="evenodd" />
            </Tooltip>
          )}
        </svg>
        <div className={center}>
          <div className={centerLabel}>{label}</div>
        </div>
      </div>
    </div>
  );
};
