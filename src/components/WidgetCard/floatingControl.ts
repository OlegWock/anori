import { cva } from "styled-system/css";

// Shared look + position for a widget card's floating edit controls: the corner buttons and the
// resize handle. These intentionally don't use the design-system Button — they have their own look.
// Compact-mode positions use the `_compact` condition.
export const floatingControl = cva({
  base: {
    position: "absolute",
    display: "flex",
    zIndex: 1,
    padding: "1-5",
    borderRadius: "xl",
    bg: "surface",
    color: "accent",
    borderWidth: "2px",
    borderStyle: "solid",
    borderColor: "accent.border",
    boxShadow: "raised",
  },
  variants: {
    position: {
      remove: { top: "-14px", right: "-14px", _compact: { top: "-8px", right: "-4px" } },
      edit: { top: "30px", right: "-14px", _compact: { right: "-4px" } },
      drag: {
        top: "-14px",
        left: "-14px",
        cursor: "grab",
        touchAction: "none",
        _compact: { top: "-8px", left: "-4px" },
      },
      resize: {
        bottom: "-14px",
        right: "-14px",
        cursor: "grab",
        touchAction: "none",
        _compact: { bottom: "-8px", right: "-4px" },
      },
    },
  },
});
