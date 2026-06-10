import { css } from "styled-system/css";

// Shared styles for the iframe widgets' config screens (embedded + expandable).
export const config = css({
  display: "flex",
  flexDirection: "column",
  gap: "3",
  alignItems: "stretch",
});
// A field-like wrapper that hugs its content instead of stretching (e.g. a lone checkbox).
export const compactField = css({ display: "flex", flexDirection: "column", alignItems: "flex-start" });
// Top section (expandable widget): the icon column (hugs) next to a main column (title + url) that takes the rest.
export const row = css({ display: "flex", gap: "5", alignItems: "flex-start" });
export const mainColumn = css({ display: "flex", flexDirection: "column", gap: "3", flex: 1 });
// The icon-picker trigger previews the chosen icon; drop the Button's fixed height so it hugs the glyph.
export const iconPickerTrigger = css({ alignSelf: "center", height: "auto", px: "2", py: "2" });
export const urlImportWrapper = css({ display: "flex", gap: "2", "& .Input": { flexGrow: 1 } });
export const saveConfig = css({ alignSelf: "flex-end", marginTop: "4" });
