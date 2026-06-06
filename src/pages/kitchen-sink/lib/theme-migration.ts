import { type ThemeInputs, themeColorsToInputs } from "@anori/design-system/theme-translation";
import { themes } from "@anori/utils/user-data/theme-base";

export type ThemePreset = { name: string; image: string } & ThemeInputs;

export const builtinThemePresets: ThemePreset[] = themes.map((t) => ({
  name: t.name,
  image: t.type === "builtin" ? `/assets/images/backgrounds/${t.background}` : "",
  ...themeColorsToInputs(t.colors),
}));
