import { css } from "styled-system/css";

// The "open original page" icon link — used by the embedded iframe widget (header / overlay) and by
// the expandable widget's expand-area control.
export const openUrlBtn = css({
  paddingBlock: "1-5",
  paddingInline: "4",
  background: "transparent",
  transition: "0.2s ease-in-out, box-shadow 0.35s ease-in-out",
  lineHeight: "none",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  userSelect: "none",
  "@media (any-hover: hover)": { "&:hover": { background: "frosted" } },
});
