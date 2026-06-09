import { css } from "styled-system/css";

// Shared styles for BookmarkWidgetConfig and BookmarkGroupWidgetConfig.
export const config = css({
  display: "flex",
  flexDirection: "column",
  gap: "3",
  alignItems: "stretch",
  minWidth: "500px",
});
// A field-like wrapper that hugs its content instead of stretching (e.g. a lone checkbox shouldn't span the row).
export const compactField = css({ display: "flex", flexDirection: "column", alignItems: "flex-start" });
// Top section: the icon column (hugs) next to a main column (title + url(s)) that takes the rest.
export const row = css({ display: "flex", gap: "5", alignItems: "flex-start" });
export const mainColumn = css({ display: "flex", flexDirection: "column", gap: "3", flex: 1 });
// The trigger previews the chosen icon, so it drops the Button's fixed height and hugs the icon
// (otherwise the 36px height squishes the larger glyph).
export const iconPickerTrigger = css({ alignSelf: "center", height: "auto", px: "2", py: "2" });
export const saveConfig = css({ alignSelf: "flex-end", marginTop: "4" });
export const urlImportWrapper = css({ display: "flex", gap: "2", "& .Input": { flexGrow: 1 } });
export const urls = css({ display: "flex", flexDirection: "column", gap: "3" });
export const addButtonWrapper = css({ display: "flex", justifyContent: "flex-start", marginTop: "2" });
