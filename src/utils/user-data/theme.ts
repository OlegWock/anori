import { type AnoriStorage, anoriSchema, getAnoriStorage } from "@anori/utils/storage";
import isEqual from "lodash/isEqual";
import { applyTheme, registerThemeBackgroundResolver, themes } from "./theme-base";

export type { BuiltinTheme, CustomTheme, PartialCustomTheme, Theme } from "./theme-base";
export {
  applyBuiltinTheme,
  applyTheme,
  applyThemeColors,
  defaultTheme,
  themes,
} from "./theme-base";

/**
 * Creates the composite key for theme background files.
 * Format: {themeName}:{variant}
 */
const getThemeBackgroundKey = (themeName: string, variant: "original" | "blurred"): string => {
  return `${themeName}:${variant}`;
};

export const getThemeBackground = async (themeName: string): Promise<Blob> => {
  const storage = await getAnoriStorage({ sync: false });
  const key = getThemeBackgroundKey(themeName, "blurred");
  const result = await storage.files.get(anoriSchema.themeBackgrounds.byId(key));

  if (!result) {
    throw new Error(`Theme background not found: ${themeName}`);
  }

  return result.blob;
};

registerThemeBackgroundResolver(getThemeBackground);

export const saveThemeBackground = async (
  themeName: string,
  variant: "original" | "blurred",
  content: ArrayBuffer | Blob,
) => {
  const storage = await getAnoriStorage();
  const blob = content instanceof Blob ? content : new Blob([content]);
  const key = getThemeBackgroundKey(themeName, variant);

  await storage.files.set(anoriSchema.themeBackgrounds.byId(key), blob, {
    themeName,
    variant,
  });
};

export const getThemeBackgroundOriginal = async (themeName: string): Promise<Blob> => {
  const storage = await getAnoriStorage();
  const key = getThemeBackgroundKey(themeName, "original");
  const result = await storage.files.get(anoriSchema.themeBackgrounds.byId(key));

  if (!result) {
    throw new Error(`Original theme background not found: ${themeName}`);
  }

  return result.blob;
};

export const deleteThemeBackgrounds = async (themeName: string) => {
  const storage = await getAnoriStorage();

  await storage.files.delete(anoriSchema.themeBackgrounds.byId(getThemeBackgroundKey(themeName, "original")));
  await storage.files.delete(anoriSchema.themeBackgrounds.byId(getThemeBackgroundKey(themeName, "blurred")));
};

export const deleteAllThemeBackgrounds = async () => {
  const storage = await getAnoriStorage();
  const allMeta = storage.files.getMeta(anoriSchema.themeBackgrounds.all());

  for (const key of Object.keys(allMeta)) {
    await storage.files.delete(anoriSchema.themeBackgrounds.byId(key));
  }
};

export const getAllCustomThemeBackgroundFiles = async (): Promise<
  Array<{ themeName: string; variant: "original" | "blurred" }>
> => {
  const storage = await getAnoriStorage();
  const allMeta = storage.files.getMeta(anoriSchema.themeBackgrounds.all());

  return Object.values(allMeta).map((meta) => ({
    themeName: meta.properties?.themeName ?? "",
    variant: meta.properties?.variant ?? "blurred",
  }));
};

export const watchForThemeUpdates = (storage: AnoriStorage) => {
  const applyCurrentTheme = () => {
    const themeName = storage.get(anoriSchema.theme);
    const customThemes = storage.get(anoriSchema.customThemes);
    const theme = [...themes, ...customThemes].find((t) => t.name === themeName);
    if (theme) {
      applyTheme(theme);
    }
  };

  const subscribeToCurrentThemeParameters = () => {
    const themeName = storage.get(anoriSchema.theme);

    const unsubBackground = storage.files.subscribe(
      anoriSchema.themeBackgrounds.byId(`${themeName}:blurred`),
      async (meta, oldMeta, info) => {
        if (info.source === "remote" || info.source === "external") {
          if (meta && meta.path !== oldMeta?.path) {
            applyCurrentTheme();
          }
        }
      },
    );
    const unsubParameters = storage.subscribe(anoriSchema.customThemes, (newCustomThemes, oldCustomThemes, info) => {
      if (info.source === "remote" || info.source === "external") {
        const newCustomTheme = newCustomThemes?.find((t) => t.name === themeName);
        const oldCustomTheme = oldCustomThemes?.find((t) => t.name === themeName);
        if (!isEqual(newCustomTheme, oldCustomTheme)) {
          applyCurrentTheme();
        }
      }
    });

    unsubCurrentThemeParameters?.();
    unsubCurrentThemeParameters = () => {
      unsubBackground();
      unsubParameters();
    };
  };

  let unsubCurrentThemeParameters: VoidFunction | null = null;

  const unsubActiveTheme = storage.subscribe(anoriSchema.theme, (_newTheme, _oldTheme, info) => {
    subscribeToCurrentThemeParameters();
    if (info.source === "remote" || info.source === "external") {
      applyCurrentTheme();
    }
  });

  return () => {
    unsubActiveTheme();
    unsubCurrentThemeParameters?.();
  };
};
