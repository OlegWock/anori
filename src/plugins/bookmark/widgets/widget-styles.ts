import { css, cva } from "styled-system/css";

export const widget = css({
  display: "flex",
  alignItems: "stretch",
  textDecoration: "none",
  flexGrow: 1,
  maxHeight: "100%",
  padding: "4",
  position: "relative",
  cursor: "pointer",
  textAlign: "start",
  "&:hover .open-in-iframe": { display: "flex" },
});

export const bookmarkContent = cva({
  base: {
    display: "flex",
    alignItems: "center",
    textDecoration: "none",
    flexGrow: 1,
    overflow: "hidden",
    "& svg": { color: "icon.subtle" },
  },
  variants: {
    size: {
      s: { flexFlow: "column-reverse", alignItems: "flex-start" },
      m: {},
    },
  },
});

export const bookmarkText = css({
  flex: 1,
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between",
  alignSelf: "stretch",
  overflow: "hidden",
});

export const bookmarkH2 = cva({
  base: { marginTop: "1", marginBottom: "4", lineHeight: "1.25" },
  variants: {
    size: {
      s: { marginTop: "3", marginBottom: "1", lineHeight: "none", whiteSpace: "nowrap" },
      m: {},
    },
  },
});

export const bookmarkHost = css({
  fontSize: "xs",
  color: "text.placeholder",
  whiteSpace: "nowrap",
  textOverflow: "ellipsis",
  overflow: "hidden",
});

export const loadingIcon = css({ animation: "spin 1.5s ease-in-out infinite" });

export const cornerControls = css({
  position: "absolute",
  top: "1rem",
  right: "1rem",
  left: "1rem",
  userSelect: "none",
  display: "flex",
  flexDirection: "row-reverse",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: "2",
});

export const statusDot = css({
  width: "1rem",
  height: "1rem",
  borderRadius: "md",
  border: "0.2rem solid var(--ds-surface)",
});

export const expandButton = css({ display: "none" });

export const expandArea = css({
  justifyContent: "center",
  alignItems: "center !important",
  "& iframe": { flexGrow: 1, alignSelf: "stretch", borderRadius: "lg", background: "white" },
});
