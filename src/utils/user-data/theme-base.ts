import { applyDesignSystemTokens } from "@anori/design-system/apply";
import {
  type Color,
  colorToOklch,
  darken,
  lighten,
  type OklchColor,
  oklchToColor,
  toCss,
  toCssHslValues,
  toCssOklch,
  transparentize,
} from "@anori/utils/color";
import { setPageBackground } from "@anori/utils/page";
import browser from "webextension-polyfill";

// Built-in themes are the source of truth in OKLCH. Custom themes (user-created via the HSL color
// picker) stay in HSL `Color`; `resolveThemeColors` / `applyThemeColors` bridge both to the legacy
// HSL vars and feed the OKLCH design system.
export type BuiltinTheme = {
  name: string;
  background: string;
  type: "builtin";
  colors: {
    accent: OklchColor;
    background: OklchColor;
    text: OklchColor;
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

const WHITE: OklchColor = { l: 1, c: 0, h: 0 };

export const themes: Theme[] = [
  {
    name: "Greenery",
    type: "builtin",
    background: "greenery.jpg",
    colors: {
      accent: { l: 0.6886, c: 0.13, h: 160.26 },
      text: WHITE,
      background: { l: 0.3592, c: 0.062, h: 169.07 },
    },
  },
  {
    name: "Forest lake",
    type: "builtin",
    background: "forest-lake.jpg",
    colors: {
      accent: { l: 0.7706, c: 0.114, h: 219.46 },
      text: WHITE,
      background: { l: 0.3816, c: 0.0767, h: 236.75 },
    },
  },
  {
    name: "Mountains",
    type: "builtin",
    background: "mountains.jpg",
    colors: {
      accent: { l: 0.5443, c: 0.1589, h: 251.13 },
      text: WHITE,
      background: { l: 0.3514, c: 0.0872, h: 245.55 },
    },
  },
  {
    name: "Sakura",
    type: "builtin",
    background: "sakura.jpg",
    colors: {
      accent: { l: 0.7831, c: 0.0838, h: 345.08 },
      text: WHITE,
      background: { l: 0.514, c: 0.1027, h: 357.02 },
    },
  },
  {
    name: "Sunflowers",
    type: "builtin",
    background: "sunflowers.jpg",
    colors: {
      accent: { l: 0.5325, c: 0.0831, h: 225.82 },
      text: WHITE,
      background: { l: 0.3368, c: 0.0383, h: 229.28 },
    },
  },
  {
    name: "Hygge",
    type: "builtin",
    background: "table.jpg",
    colors: {
      accent: { l: 0.6574, c: 0.0063, h: 84.57 },
      text: WHITE,
      background: { l: 0.3693, c: 0.0128, h: 57.88 },
    },
  },
  {
    name: "Maples",
    type: "builtin",
    background: "maple.jpg",
    colors: {
      accent: { l: 0.5572, c: 0.1783, h: 32.38 },
      text: WHITE,
      background: { l: 0.2717, c: 0.0462, h: 22.65 },
    },
  },
  {
    name: "Highlands",
    type: "builtin",
    background: "highlands.jpg",
    colors: {
      accent: { l: 0.7612, c: 0.1611, h: 73.8 },
      text: WHITE,
      background: { l: 0.3937, c: 0.0514, h: 67.25 },
    },
  },
];

export const defaultTheme = themes[0];

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
    prom = getThemeBackgroundImpl(theme.name).then((bg) => {
      const url = URL.createObjectURL(bg);
      setPageBackground(url);
    });
  }

  applyThemeColors(resolveThemeColors(theme), themeDesignSystemColors(theme));
  await prom;
};

// Bridges either theme kind to the HSL `Color` representation the legacy vars + UI work in. Built-in
// themes are authored in OKLCH; custom themes already store HSL.
export const resolveThemeColors = (theme: Theme): { accent: Color; background: Color; text: Color } =>
  theme.type === "builtin"
    ? {
        accent: oklchToColor(theme.colors.accent),
        background: oklchToColor(theme.colors.background),
        text: oklchToColor(theme.colors.text),
      }
    : theme.colors;

// The OKLCH the design system consumes: built-ins pass their source directly (no HSL round-trip);
// custom themes return undefined so `applyThemeColors` derives it from their HSL colors.
const themeDesignSystemColors = (theme: Theme): { accent: OklchColor; background: OklchColor } | undefined =>
  theme.type === "builtin" ? { accent: theme.colors.accent, background: theme.colors.background } : undefined;

export const applyThemeColors = (
  colors: { accent: Color; background: Color; text: Color },
  dsColors?: { accent: OklchColor; background: OklchColor },
) => {
  let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement("meta");
    meta.name = "theme-color";
  }
  meta.content = toCss(colors.background);
  document.head.appendChild(meta);
  const root = document.documentElement;

  // Injected in oklch() notation (the source of truth). Exception: --text-hsl stays HSL values
  // because legacy SCSS consumes it as `hsla(var(--text-hsl) / <alpha>)`.
  root.style.setProperty("--accent", toCssOklch(colors.accent));
  root.style.setProperty("--accent-subtle", toCssOklch(transparentize(colors.accent, 0.5)));
  root.style.setProperty("--background", toCssOklch(colors.background));
  root.style.setProperty("--text", toCssOklch(colors.text));
  root.style.setProperty("--text-hsl", toCssHslValues(colors.text));
  root.style.setProperty("--text-subtle-1", toCssOklch(transparentize(colors.text, 0.15)));
  root.style.setProperty("--text-subtle-2", toCssOklch(transparentize(colors.text, 0.35)));
  root.style.setProperty("--text-border", toCssOklch(transparentize(colors.text, 0.75)));

  const lighterBg =
    colors.background.lightness < 0.5 ? lighten(colors.background, 0.05) : darken(colors.background, 0.05);
  const darkerText = colors.text.lightness > 0.5 ? darken(colors.text, 0.45) : lighten(colors.text, 0.45);
  root.style.setProperty("--background-lighter", toCssOklch(lighterBg));
  root.style.setProperty("--text-disabled", toCssOklch(darkerText));

  // New design system (src/design-system) runs alongside the old vars above; components migrate to
  // its --ds-* tokens gradually. Prefer the OKLCH source of truth (built-in themes); for custom
  // themes / the live editor preview, derive it from the HSL colors.
  applyDesignSystemTokens(
    dsColors ?? { accent: colorToOklch(colors.accent), background: colorToOklch(colors.background) },
  );
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
