import type { Mode, OklchInput } from "@anori/design-system/color-engine";
import { themes } from "@anori/utils/user-data/theme-base";

export type ThemePreset = { name: string; image: string; accent: OklchInput; mode: Mode };

// Built-in themes are a single OKLCH accent + image now; light/dark is a separate global knob, so the
// preset just carries a sensible starting mode (the kitchen-sink has its own light/dark toggle).
const LIGHT_THEMES = new Set(["Sakura"]);

export const builtinThemePresets: ThemePreset[] = themes.map((t) => ({
  name: t.name,
  image: `/assets/images/backgrounds/${t.background}`,
  accent: t.accent,
  mode: LIGHT_THEMES.has(t.name) ? "light" : "dark",
}));
