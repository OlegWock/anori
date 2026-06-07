import type { Mode, OklchInput } from "@anori/design-system/color-engine";
import { themes } from "@anori/utils/user-data/theme-base";

export type ThemePreset = { name: string; image: string; accent: OklchInput; mode: Mode };

// Built-in themes are OKLCH-native now, so the preset is the accent directly + a mode derived from
// the background lightness (the only thing the engine uses the background for).
export const builtinThemePresets: ThemePreset[] = themes.map((t) => ({
  name: t.name,
  image: t.type === "builtin" ? `/assets/images/backgrounds/${t.background}` : "",
  accent: t.type === "builtin" ? t.colors.accent : { l: 0.7, c: 0.15, h: 250 },
  mode: (t.type === "builtin" ? t.colors.background.l : 0.3) > 0.5 ? "light" : "dark",
}));
