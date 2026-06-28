import { css } from "styled-system/css";

export const tasksWidget = css({
  display: "flex",
  flexDirection: "column",
  alignItems: "stretch",
  textDecoration: "none",
  flexGrow: 1,
  overflow: "hidden",
});
export const scrollArea = css({
  flexGrow: 1,
  "& .ScrollAreaContent": { display: "flex", flexDirection: "column", flexGrow: 1 },
});
export const tasksHeader = css({ display: "flex", justifyContent: "space-between", alignItems: "center" });
export const tasksList = css({
  display: "flex",
  flexDirection: "column",
  flexGrow: 1,
  gap: "1",
  paddingBlock: "0-5",
});
export const taskRow = css({
  display: "flex",
  alignItems: "center",
  gap: "0-5",
  position: "relative",
  background: "surface",
  borderRadius: "md",
  "@media (any-hover: hover)": { "&:hover .drag-control": { visibility: "visible" } },
});
// Reserves its column in the row (visibility, not display) but only shows on hover; always on touch.
export const dragControl = css({
  visibility: "hidden",
  ".is-touch-device &": { visibility: "visible" },
  // `!` to beat the Button's own cursor: pointer.
  cursor: "grab!",
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
  // Override the DS Textarea wrapper's roomier py:3 — task rows want to be tight, especially vertically.
  // `!` so it wins over the component's own atomic padding regardless of stylesheet order.
  paddingBlock: "0-5!",
  paddingInline: "2!",
});
export const noTasks = css({ flexGrow: 1, justifyContent: "center" });

export const config = css({ display: "flex", flexDirection: "column", gap: "3", alignItems: "stretch" });
export const saveConfig = css({ alignSelf: "flex-end", marginTop: "4" });
