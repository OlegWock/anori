import { applyDesignSystemTokens } from "@anori/design-system/apply";
import type { Mode } from "@anori/design-system/color-engine";
import type { OklchColor } from "@anori/utils/color";
import { setPageBackground } from "@anori/utils/page";
import browser from "webextension-polyfill";

// A theme is just an accent colour (OKLCH) + a background image; the full palette is generated from the
// accent, and light/dark is a separate global knob (`colorScheme`), not a per-theme property.
export type BuiltinTheme = {
  name: string;
  type: "builtin";
  background: Record<Mode, string>;
  accent: OklchColor;
};

export type CustomTheme = {
  name: string;
  type: "custom";
  blur: number;
  accent: OklchColor;
  hideDotPattern?: boolean;
};

export type PartialCustomTheme = {
  name: string;
  type: "custom";
  blur: number;
  accent: OklchColor;
  hideDotPattern?: boolean;
  background?: string;
  originalBackground?: string;
};

export type Theme = BuiltinTheme | CustomTheme;

export type ColorScheme = "light" | "dark" | "system";

const bg = (dark: string, light: string = dark): Record<Mode, string> => ({ light, dark });

export const themes: BuiltinTheme[] = [
  {
    name: "Greenery",
    type: "builtin",
    background: bg("greenery.jpg", "greenery-light.jpg"),
    accent: { l: 0.38, c: 0.13, h: 160.26 },
  },
  {
    name: "Forest lake",
    type: "builtin",
    background: bg("forest-lake.jpg", "forest-lake-light.jpg"),
    accent: { l: 0.38, c: 0.114, h: 219.46 },
  },
  {
    name: "Mountains",
    type: "builtin",
    background: bg("mountains.jpg", "mountains-light.jpg"),
    accent: { l: 0.38, c: 0.1589, h: 251.13 },
  },
  {
    name: "Sakura",
    type: "builtin",
    background: bg("sakura.jpg", "sakura-light.jpg"),
    accent: { l: 0.38, c: 0.0838, h: 345.08 },
  },
  {
    name: "Sunflowers",
    type: "builtin",
    background: bg("sunflowers.jpg", "sunflowers-light.jpg"),
    accent: { l: 0.38, c: 0.0831, h: 209.0 },
  },
  {
    name: "Hygge",
    type: "builtin",
    background: bg("table.jpg", "table-light.jpg"),
    accent: { l: 0.38, c: 0.0063, h: 84.57 },
  },
  {
    name: "Maples",
    type: "builtin",
    background: bg("maple.jpg", "maple-light.jpg"),
    accent: { l: 0.38, c: 0.1783, h: 32.38 },
  },
  {
    name: "Highlands",
    type: "builtin",
    background: bg("highlands.jpg", "highlands-light.jpg"),
    accent: { l: 0.38, c: 0.1611, h: 73.8 },
  },
];

export const defaultTheme = themes[0];

export const resolveColorScheme = (scheme: ColorScheme): Mode => {
  if (scheme !== "system") return scheme;
  const prefersLight =
    typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: light)").matches === true;
  return prefersLight ? "light" : "dark";
};

export const applyBuiltinTheme = (themeName: Theme["name"], mode: Mode) => {
  const theme = themes.find((t) => t.name === themeName);
  if (!theme) return;
  applyTheme(theme, mode);
};

export const applyTheme = async (theme: Theme, mode: Mode) => {
  let prom = Promise.resolve();
  if (theme.type === "builtin") {
    setPageBackground(browser.runtime.getURL(`/assets/images/backgrounds/${theme.background[mode]}`));
  } else {
    prom = getThemeBackgroundImpl(theme.name).then((blob) => {
      const url = URL.createObjectURL(blob);
      setPageBackground(url);
    });
  }

  applyThemeColors(theme.accent, mode);
  applyThemeDecorations(theme.type === "custom" ? theme : {});
  await prom;
};

export type ThemeDecorations = {
  hideDotPattern?: boolean;
};

export const applyThemeDecorations = (decorations: ThemeDecorations) => {
  document.documentElement.classList.toggle("theme-hide-dot-pattern", !!decorations.hideDotPattern);
};

export const applyThemeColors = (accent: OklchColor, mode: Mode) => {
  const { tokens } = applyDesignSystemTokens(accent, mode);

  let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement("meta");
    meta.name = "theme-color";
    document.head.appendChild(meta);
  }
  meta.content = tokens.surface;
};

type ThemeBackgroundResolver = (themeName: string) => Promise<Blob>;

const g = self as typeof self & {
  __anoriThemeBgResolver?: ThemeBackgroundResolver;
  __anoriThemeBgResolverReady?: (resolver: ThemeBackgroundResolver) => void;
  __anoriThemeBgResolverPromise?: Promise<ThemeBackgroundResolver>;
};

const getResolverPromise = (): Promise<ThemeBackgroundResolver> => {
  if (!g.__anoriThemeBgResolverPromise) {
    g.__anoriThemeBgResolverPromise = new Promise<ThemeBackgroundResolver>((resolve) => {
      g.__anoriThemeBgResolverReady = resolve;
    });
  }
  return g.__anoriThemeBgResolverPromise;
};

const getThemeBackgroundImpl: ThemeBackgroundResolver = (themeName) => {
  if (g.__anoriThemeBgResolver) return g.__anoriThemeBgResolver(themeName);
  return getResolverPromise().then((resolver) => resolver(themeName));
};

export const registerThemeBackgroundResolver = (resolver: ThemeBackgroundResolver) => {
  g.__anoriThemeBgResolver = resolver;
  g.__anoriThemeBgResolverReady?.(resolver);
};
