import { anoriSchema, useStorageValue, useWritableStorageValue } from "@anori/utils/storage";
import { themes } from "./theme";

export const useCurrentTheme = () => {
  const [themeName, setThemeName] = useWritableStorageValue(anoriSchema.latestSchema.definition.theme);
  const [customThemes] = useStorageValue(anoriSchema.latestSchema.definition.customThemes);

  const theme = [...themes, ...(customThemes ?? [])].find((t) => t.name === themeName) ?? themes[0];
  return [theme, setThemeName] as const;
};
