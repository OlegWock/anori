import { useBrowserStorageValue } from "@anori/utils/storage/api";
import { defaultTheme, themes } from "./theme";

export const useCurrentTheme = () => {
  const [themeName, setThemeName] = useBrowserStorageValue("theme", defaultTheme.name);
  const [customThemes] = useBrowserStorageValue("customThemes", []);

  const theme = [...themes, ...customThemes].find((t) => t.name === themeName) ?? themes[0];
  return [theme, setThemeName] as const;
};
