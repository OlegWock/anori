import { css, cva } from "styled-system/css";

export const weatherWidget = cva({
  base: { "& svg": { color: "icon" } },
  variants: {
    type: {
      current: { display: "flex", alignItems: "center", textDecoration: "none", flexGrow: 1, gap: "2" },
      forecast: {
        display: "flex",
        flexDirection: "column",
        alignItems: "stretch",
        textDecoration: "none",
        flexGrow: 1,
        gap: "2",
        "& h2": { lineHeight: "1.15" },
      },
    },
  },
});
export const temperature = cva({
  base: { display: "flex", alignItems: "center", gap: "1-5", fontSize: "2xl", lineHeight: "none", marginBottom: "1-5" },
  variants: { small: { true: { fontSize: "lg" } } },
});
export const wind = css({ display: "flex", alignItems: "center", gap: "1-5" });
export const location = cva({
  base: { display: "flex", alignItems: "center", gap: "1-5" },
  variants: { small: { true: { fontSize: "sm" } } },
});
export const dayRow = css({ display: "flex", alignItems: "center", textDecoration: "none", flexGrow: 1, gap: "2" });

export const config = css({ display: "flex", flexDirection: "column", gap: "3", alignItems: "stretch" });
export const unitsRow = css({ display: "flex", gap: "3" });
export const unitField = css({ flex: 1 });
export const saveConfig = css({ alignSelf: "flex-end", marginTop: "4" });
export const attribution = css({
  fontSize: "xs",
  textAlign: "center",
  opacity: 0.6,
  display: "block",
  "& a": { color: "inherit" },
});
