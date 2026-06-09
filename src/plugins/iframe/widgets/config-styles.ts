import { css } from "styled-system/css";

// Shared styles for the iframe widgets' config screens (embedded + expandable).
export const config = css({
  display: "flex",
  flexDirection: "column",
  gap: "3",
  alignItems: "stretch",
  minWidth: "500px",
});
// A field-like wrapper that hugs its content instead of stretching (e.g. a lone checkbox).
export const compactField = css({ display: "flex", flexDirection: "column", alignItems: "flex-start" });
// The icon-picker trigger previews the chosen icon; drop the Button's fixed height so it hugs the glyph.
export const iconPickerTrigger = css({ alignSelf: "center", height: "auto", px: "2", py: "2" });
export const urlImportWrapper = css({ display: "flex", gap: "2", "& .Input": { flexGrow: 1 } });
export const saveConfig = css({ alignSelf: "flex-end", marginTop: "4" });
