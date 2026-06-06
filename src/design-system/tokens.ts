// Shared design-system token scales: the allowed keys for spacing/radius props, and helpers to turn
// a token into its CSS value. Mirrors the --spacing-* / --radius-* scales declared in base.scss.

export type SpacingToken = "none" | "0-5" | "1" | "1-5" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "12" | "16";

export type RadiusToken = "none" | "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | "full";

export const spacingVar = (token: SpacingToken) => (token === "none" ? "0" : `var(--spacing-${token})`);
export const radiusVar = (token: RadiusToken) => (token === "none" ? "0" : `var(--radius-${token})`);
