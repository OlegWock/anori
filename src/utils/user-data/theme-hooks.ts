import { anoriSchema } from "@anori/utils/storage";
import { useStorageValue } from "@anori/utils/storage-lib";
import { themes } from "./theme";

export const useCurrentTheme = () => {
  const [themeName, setThemeName] = useStorageValue(anoriSchema.theme);
  const [customThemes] = useStorageValue(anoriSchema.customThemes);

  const theme = [...themes, ...customThemes].find((t) => t.name === themeName) ?? themes[0];
  return [theme, setThemeName] as const;
};
