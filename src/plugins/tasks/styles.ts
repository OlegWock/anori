import { css } from "styled-system/css";

export const tasksWidget = css({
  display: "flex",
  flexDirection: "column",
  alignItems: "stretch",
  textDecoration: "none",
  flexGrow: 1,
  overflow: "hidden",
});
// Fills the widget; force Radix's table wrapper to flex so the list can grow.
export const scrollArea = css({
  flexGrow: 1,
  "& .ScrollAreaViewport > div[style]": { display: "flex !important" },
});
export const tasksHeader = css({ display: "flex", justifyContent: "space-between", alignItems: "flex-start" });
export const tasksList = css({
  display: "flex",
  flexDirection: "column",
  flexGrow: 1,
  gap: "0-5",
  paddingBlock: "0-5",
});
// The drag handle is hidden until the row is hovered (or always on touch devices).
export const taskRow = css({
  display: "flex",
  alignItems: "center",
  gap: "0-5",
  position: "relative",
  "@media (any-hover: hover)": { "&:hover .drag-control": { visibility: "visible" } },
});
export const dragControl = css({
  zIndex: 1,
  visibility: "hidden",
  // Touch devices have no hover, so the drag handle is always shown there.
  ".is-touch-device &": { visibility: "visible" },
  position: "absolute",
  insetInlineEnd: 0,
  background: "card",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  borderRadius: "xs",
  padding: "1",
  cursor: "grab",
});
export const inputWrapper = css({ position: "relative", flexGrow: 1, display: "flex" });
export const scribble = css({
  position: "absolute",
  inset: 0,
  opacity: 0.85,
  color: "text.placeholder",
  width: "100%",
  height: "100%",
  pointerEvents: "none",
});
export const taskInput = css({
  flexGrow: 1,
  marginInline: "0-5",
  marginTop: "1px",
  paddingBlock: "1",
  paddingInline: "2",
  textOverflow: "ellipsis",
  resize: "none",
  "&::-webkit-scrollbar": { width: "7px", height: "7px" },
  "&::-webkit-scrollbar-thumb": { borderRadius: "md", border: "2px solid var(--ds-card)", backgroundColor: "card" },
  "&::-webkit-scrollbar-track": { backgroundColor: "surface.elevated", borderRadius: "md" },
  scrollbarColor: "var(--ds-card) transparent",
});
export const noTasks = css({
  flexGrow: 1,
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  color: "text.placeholder",
});

export const config = css({ display: "flex", flexDirection: "column", gap: "3", alignItems: "stretch" });
export const saveConfig = css({ alignSelf: "flex-end", marginTop: "4" });
