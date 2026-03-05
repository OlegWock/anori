import { type Color, darken, fromHsl, lighten, toCss, toCssHslValues, transparentize } from "@anori/utils/color";
import { setPageBackground } from "@anori/utils/page";
import { type AnoriStorage, anoriSchema, getAnoriStorage } from "@anori/utils/storage";
import isEqual from "lodash/isEqual";
import browser from "webextension-polyfill";

export type BuiltinTheme = {
  name: string;
  background: string;
  type: "builtin";
  colors: {
    accent: Color;
    background: Color;
    text: Color;
  };
};

export type CustomTheme = {
  name: string;
  type: "custom";
  blur: number;
  colors: {
    accent: Color;
    background: Color;
    text: Color;
  };
};

export type PartialCustomTheme = {
  name: string;
  background?: string;
  originalBackground?: string;
  type: "custom";
  blur: number;
  colors: {
    accent: Color;
    background: Color;
    text: Color;
  };
};

export type Theme = BuiltinTheme | CustomTheme;

export const themes: Theme[] = [
  {
    name: "Greenery",
    type: "builtin",
    background: "greenery.jpg",
    colors: {
      accent: fromHsl(147, 59.3, 44.3),
      text: fromHsl(0, 0, 100),
      background: fromHsl(162, 59.6, 17.5),
    },
  },
  {
    name: "Forest lake",
    type: "builtin",
    background: "forest-lake.jpg",
    colors: {
      accent: fromHsl(193, 75.1, 60.6),
      text: fromHsl(0, 0, 100),
      background: fromHsl(200, 78.9, 22.4),
    },
  },
  {
    name: "Mountains",
    type: "builtin",
    background: "mountains.jpg",
    colors: {
      accent: fromHsl(206, 100, 39.2),
      text: fromHsl(0, 0, 100),
      background: fromHsl(204, 94.2, 20.4),
    },
  },
  {
    name: "Sakura",
    type: "builtin",
    background: "sakura.jpg",
    colors: {
      accent: fromHsl(327, 49.6, 75.9),
      text: fromHsl(0, 0, 100),
      background: fromHsl(337, 32.4, 44.1),
    },
  },
  {
    name: "Sunflowers",
    type: "builtin",
    background: "sunflowers.jpg",
    colors: {
      accent: fromHsl(196, 53.4, 37.1),
      text: fromHsl(0, 0, 100),
      background: fromHsl(199, 36.5, 20.4),
    },
  },
  {
    name: "Hygge",
    type: "builtin",
    background: "table.jpg",
    colors: {
      accent: fromHsl(40, 2.7, 56.5),
      text: fromHsl(0, 0, 100),
      background: fromHsl(25, 9.5, 24.7),
    },
  },
  {
    name: "Maples",
    type: "builtin",
    background: "maple.jpg",
    colors: {
      accent: fromHsl(9, 69, 46),
      text: fromHsl(0, 0, 100),
      background: fromHsl(2, 35, 17),
    },
  },
  {
    name: "Highlands",
    type: "builtin",
    background: "highlands.jpg",
    colors: {
      accent: fromHsl(40, 98, 47),
      text: fromHsl(0, 0, 100),
      background: fromHsl(31, 39, 25),
    },
  },
];

export const defaultTheme = themes[0];

/**
 * Creates the composite key for theme background files.
 * Format: {themeName}:{variant}
 */
const getThemeBackgroundKey = (themeName: string, variant: "original" | "blurred"): string => {
  return `${themeName}:${variant}`;
};

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

export const getThemeBackground = async (themeName: string): Promise<Blob> => {
  const storage = await getAnoriStorage({ sync: false });
  const key = getThemeBackgroundKey(themeName, "blurred");
  const result = await storage.files.get(anoriSchema.themeBackgrounds.byId(key));

  if (!result) {
    throw new Error(`Theme background not found: ${themeName}`);
  }

  return result.blob;
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

export const applyBuiltinTheme = (themeName: Theme["name"]) => {
  const theme = themes.find((t) => t.name === themeName);
  if (!theme) return;
  applyTheme(theme);
};

export const applyTheme = async (theme: Theme) => {
  let prom = Promise.resolve();
  if (theme.type === "builtin") {
    setPageBackground(browser.runtime.getURL(`/assets/images/backgrounds/${theme.background}`));
  } else {
    prom = getThemeBackground(theme.name).then((bg) => {
      const url = URL.createObjectURL(bg);
      setPageBackground(url);
    });
  }

  applyThemeColors(theme.colors);
  await prom;
};

export const applyThemeColors = (colors: Theme["colors"]) => {
  let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement("meta");
    meta.name = "theme-color";
  }
  meta.content = toCss(colors.background);
  document.head.appendChild(meta);
  const root = document.documentElement;

  root.style.setProperty("--accent", toCss(colors.accent));
  root.style.setProperty("--accent-subtle", toCss(transparentize(colors.accent, 0.5)));
  root.style.setProperty("--background", toCss(colors.background));
  root.style.setProperty("--text", toCss(colors.text));
  root.style.setProperty("--text-hsl", toCssHslValues(colors.text));
  root.style.setProperty("--text-subtle-1", toCss(transparentize(colors.text, 0.15)));
  root.style.setProperty("--text-subtle-2", toCss(transparentize(colors.text, 0.35)));
  root.style.setProperty("--text-border", toCss(transparentize(colors.text, 0.75)));

  const lighterBg =
    colors.background.lightness < 0.5 ? lighten(colors.background, 0.05) : darken(colors.background, 0.05);
  const darkerText = colors.text.lightness > 0.5 ? darken(colors.text, 0.45) : lighten(colors.text, 0.45);
  root.style.setProperty("--background-lighter", toCss(lighterBg));
  root.style.setProperty("--text-disabled", toCss(darkerText));
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
