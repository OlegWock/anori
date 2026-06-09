import { css } from "styled-system/css";

// Shared by the CPU and memory widgets.
export const widget = css({ display: "flex", flexDirection: "column", gap: "1-5", flexGrow: 1 });
export const spacer = css({ flexGrow: 1 });
export const metricValue = css({ fontSize: "2xl" });
