import { Tooltip } from "@anori/design-system/components/Tooltip/Tooltip";
import type { ReactNode } from "react";
import { css, cva } from "styled-system/css";

const track = css({
  display: "flex",
  gap: "1",
  width: "100%",
  height: "2.625rem",
  flexShrink: 0,
});
const segment = cva({
  base: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 0,
    overflow: "hidden",
    containerType: "inline-size",
    borderRadius: "md",
    fontSize: "base",
    fontWeight: "regular",
    whiteSpace: "nowrap",
    transition: "opacity 0.15s ease",
    _hover: { opacity: 0.85 },
  },
  variants: {
    kind: {
      elapsed: { bg: "accent", color: "on-accent.subtle" },
      remaining: { bg: "track", color: "text.subtle" },
    },
  },
});

const segmentLabel = css({ "@container (width < 3rem)": { display: "none" } });

export type SegmentedBarProps = {
  fraction: number;
  elapsedLabel: ReactNode;
  remainingLabel: ReactNode;
  elapsedTooltip: ReactNode;
  remainingTooltip: ReactNode;
};

export const SegmentedBar = ({
  fraction,
  elapsedLabel,
  remainingLabel,
  elapsedTooltip,
  remainingTooltip,
}: SegmentedBarProps) => {
  return (
    <div className={track}>
      {fraction > 0 && (
        <Tooltip label={elapsedTooltip} placement="top">
          <div className={segment({ kind: "elapsed" })} style={{ width: `${fraction * 100}%` }}>
            <span className={segmentLabel}>{elapsedLabel}</span>
          </div>
        </Tooltip>
      )}
      {fraction < 1 && (
        <Tooltip label={remainingTooltip} placement="top">
          <div className={segment({ kind: "remaining" })} style={{ width: `${(1 - fraction) * 100}%` }}>
            <span className={segmentLabel}>{remainingLabel}</span>
          </div>
        </Tooltip>
      )}
    </div>
  );
};
