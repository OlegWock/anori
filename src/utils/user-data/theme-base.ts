import { applyDesignSystemTokens } from "@anori/design-system/apply";
import type { Mode } from "@anori/design-system/color-engine";
import type { OklchColor } from "@anori/utils/color";
import { setPageBackground } from "@anori/utils/page";
import browser from "webextension-polyfill";

// A theme is now just an accent colour (OKLCH, the source of truth) + a background image. The full
// palette — surfaces, text, controls — is generated from the accent, and whether it renders light or
// dark is a separate global knob (`colorScheme`), not a per-theme property.
export type BuiltinTheme = {
  name: string;
  type: "builtin";
  // Built-in themes ship one background per mode: the light variant uses imagery that keeps the
  // directly-on-background text (bookmarks, folder titles/icons) readable against dark text. Custom themes
  // have a single user-provided image instead (the user owns picking one that works for their scheme).
  background: Record<Mode, string>;
  accent: OklchColor;
};

export type CustomTheme = {
  name: string;
  type: "custom";
  blur: number;
  accent: OklchColor;
};

// In-editor draft: a custom theme plus the pending (not-yet-saved) background image URLs.
export type PartialCustomTheme = {
  name: string;
  type: "custom";
  blur: number;
  accent: OklchColor;
  background?: string;
  originalBackground?: string;
};

export type Theme = BuiltinTheme | CustomTheme;

// Global light/dark knob; `system` follows the OS preference.
export type ColorScheme = "light" | "dark" | "system";

// Pairs a dark- and light-mode background filename. `light` defaults to `dark` until the light-mode
// imagery exists — at that point pass a distinct light file (e.g. `bg("greenery.jpg", "greenery-light.jpg")`).
const bg = (dark: string, light: string = dark): Record<Mode, string> => ({ light, dark });

export const themes: BuiltinTheme[] = [
  {
    name: "Greenery",
    type: "builtin",
    background: bg("greenery.jpg", "greenery-light.jpg"),
    accent: { l: 0.6886, c: 0.13, h: 160.26 },
  },
  {
    name: "Forest lake",
    type: "builtin",
    background: bg("forest-lake.jpg", "forest-lake-light.jpg"),
    accent: { l: 0.7706, c: 0.114, h: 219.46 },
  },
  {
    name: "Mountains",
    type: "builtin",
    background: bg("mountains.jpg", "mountains-light.jpg"),
    accent: { l: 0.5443, c: 0.1589, h: 251.13 },
  },
  {
    name: "Sakura",
    type: "builtin",
    background: bg("sakura.jpg", "sakura-light.jpg"),
    accent: { l: 0.7831, c: 0.0838, h: 345.08 },
  },
  {
    name: "Sunflowers",
    type: "builtin",
    background: bg("sunflowers.jpg", "sunflowers-light.jpg"),
    accent: { l: 0.5325, c: 0.0831, h: 209.0 },
  },
  {
    name: "Hygge",
    type: "builtin",
    background: bg("table.jpg", "table-light.jpg"),
    accent: { l: 0.6574, c: 0.0063, h: 84.57 },
  },
  {
    name: "Maples",
    type: "builtin",
    background: bg("maple.jpg", "maple-light.jpg"),
    accent: { l: 0.5572, c: 0.1783, h: 32.38 },
  },
  {
    name: "Highlands",
    type: "builtin",
    background: bg("highlands.jpg", "highlands-light.jpg"),
    accent: { l: 0.7612, c: 0.1611, h: 73.8 },
  },
];

export const defaultTheme = themes[0];

// Resolves the stored color-scheme knob to a concrete mode (following the OS for `system`).
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
  await prom;
};

// Generates the palette from the accent + mode, injects the `--ds-*` tokens, and points the browser
// theme-color meta at the resulting surface color.
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
