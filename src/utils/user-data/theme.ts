import { Color, darken, fromHsl, lighten, toCss, toCssHslValues, transparentize } from "@utils/color";
import { asyncIterableToArray } from "@utils/misc";
import { setPageBackground } from "@utils/page";
import { getDirectoryInRoot } from "@utils/opfs";
import browser from 'webextension-polyfill';


export type BuiltinTheme = {
    name: string,
    background: string,
    type: 'builtin',
    colors: {
        accent: Color,
        background: Color,
        text: Color,
    },
};

export type CustomTheme = {
    name: string,
    type: 'custom',
    blur: number,
    colors: {
        accent: Color,
        background: Color,
        text: Color,
    },
};

export type PartialCustomTheme = {
    name: string,
    background?: string,
    originalBackground?: string,
    type: 'custom',
    blur: number,
    colors: {
        accent: Color,
        background: Color,
        text: Color,
    },
};


export type Theme = BuiltinTheme | CustomTheme;

export const themes: Theme[] = [
    {
        name: 'Greenery',
        type: 'builtin',
        background: 'greenery.jpg',
        colors: {
            accent: fromHsl(147, 59.3, 44.3),
            text: fromHsl(0, 0, 100),
            background: fromHsl(162, 59.6, 17.5),
        }
    },
    {
        name: 'Forest lake',
        type: 'builtin',
        background: 'forest-lake.jpg',
        colors: {
            accent: fromHsl(193, 75.1, 60.6),
            text: fromHsl(0, 0, 100),
            background: fromHsl(200, 78.9, 22.4),
        }
    },
    {
        name: 'Mountains',
        type: 'builtin',
        background: 'mountains.jpg',
        colors: {
            accent: fromHsl(206, 100, 39.2),
            text: fromHsl(0, 0, 100),
            background: fromHsl(204, 94.2, 20.4),
        }
    },
    {
        name: 'Sakura',
        type: 'builtin',
        background: 'sakura.jpg',
        colors: {
            accent: fromHsl(327, 49.6, 75.9),
            text: fromHsl(0, 0, 100),
            background: fromHsl(337, 32.4, 44.1),
        }
    },
    {
        name: 'Sunflowers',
        type: 'builtin',
        background: 'sunflowers.jpg',
        colors: {
            accent: fromHsl(196, 53.4, 37.1),
            text: fromHsl(0, 0, 100),
            background: fromHsl(199, 36.5, 20.4),
        }
    },
    {
        name: 'Hygge',
        type: 'builtin',
        background: 'table.jpg',
        colors: {
            accent: fromHsl(40, 2.7, 56.5),
            text: fromHsl(0, 0, 100),
            background: fromHsl(25, 9.5, 24.7),
        }
    },
    {
        name: 'Maples',
        type: 'builtin',
        background: 'maple.jpg',
        colors: {
            accent: fromHsl(9, 69, 46),
            text: fromHsl(0, 0, 100),
            background: fromHsl(2, 35, 17),
        }
    },
    {
        name: 'Highlands',
        type: 'builtin',
        background: 'highlands.jpg',
        colors: {
            accent: fromHsl(40, 98, 47),
            text: fromHsl(0, 0, 100),
            background: fromHsl(31, 39, 25),
        }
    },
];

export const defaultTheme = themes[0];

export const CUSTOM_THEMES_FOLDER_NAME = 'custom-themes';

export const saveThemeBackground = async (filename: string, content: ArrayBuffer | Blob) => {
    const dir = await getDirectoryInRoot(CUSTOM_THEMES_FOLDER_NAME);
    const fileHandle = await dir.getFileHandle(filename, { create: true });
    const writeHandle = await fileHandle.createWritable();
    await writeHandle.write(content);
    await writeHandle.close();
};

export const getThemeBackground = async (id: CustomTheme["name"]) => {
    const root = await getDirectoryInRoot(CUSTOM_THEMES_FOLDER_NAME);
    const fileHandle = await root.getFileHandle(`${id}-blurred`);
    const file = await fileHandle.getFile();
    const blob = new Blob([file]);
    return blob
};

export const getThemeBackgroundOriginal = async (id: CustomTheme["name"]) => {
    const root = await getDirectoryInRoot(CUSTOM_THEMES_FOLDER_NAME);
    const fileHandle = await root.getFileHandle(`${id}-original`);
    const file = await fileHandle.getFile();
    const blob = new Blob([file]);
    return blob
};

export const deleteThemeBackgrounds = async (id: CustomTheme["name"]) => {
    const root = await getDirectoryInRoot(CUSTOM_THEMES_FOLDER_NAME);
    await root.removeEntry(`${id}-original`);
    await root.removeEntry(`${id}-blurred`);
};

export const deleteAllThemeBackgrounds = async () => {
    const opfsRoot = await navigator.storage.getDirectory();
    await opfsRoot.removeEntry(CUSTOM_THEMES_FOLDER_NAME, { recursive: true });
};

export const getAllCustomThemeBackgroundFiles = async () => {
    const iconsDir = await getDirectoryInRoot(CUSTOM_THEMES_FOLDER_NAME);
    const files = await asyncIterableToArray(iconsDir.values());
    return files.filter(h => h.kind === 'file') as FileSystemFileHandle[];
};

export const applyBuiltinTheme = (themeName: Theme["name"]) => {
    const theme = themes.find(t => t.name === themeName);
    if (!theme) return;
    applyTheme(theme);
};

export const applyTheme = async (theme: Theme) => {
    let prom = Promise.resolve();
    if (theme.type === 'builtin') {
        setPageBackground(browser.runtime.getURL(`/assets/images/backgrounds/${theme.background}`));
    } else {
        prom = getThemeBackground(theme.name).then(bg => {
            const url = URL.createObjectURL(bg);
            setPageBackground(url);
        });
    }

    applyThemeColors(theme.colors);
    await prom;
};

export const applyThemeColors = (colors: Theme['colors']) => {
    let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (!meta) {
        meta = document.createElement('meta');
        meta.name = 'theme-color';
    }
    meta.content = toCss(colors.background);
    document.head.appendChild(meta);
    const root = document.documentElement;

    root.style.setProperty('--accent', toCss(colors.accent));
    root.style.setProperty('--accent-subtle', toCss(transparentize(colors.accent, 0.5)));
    root.style.setProperty('--background', toCss(colors.background));
    root.style.setProperty('--text', toCss(colors.text));
    root.style.setProperty('--text-hsl', toCssHslValues(colors.text));
    root.style.setProperty('--text-subtle-1', toCss(transparentize(colors.text, 0.15)));
    root.style.setProperty('--text-subtle-2', toCss(transparentize(colors.text, 0.35)));
    root.style.setProperty('--text-border', toCss(transparentize(colors.text, 0.75)));

    const lighterBg = colors.background.lightness < 0.5 ? lighten(colors.background, 0.05) : darken(colors.background, 0.05);
    const darkerText = colors.text.lightness > 0.5 ? darken(colors.text, 0.45) : lighten(colors.text, 0.45);
    root.style.setProperty('--background-lighter', toCss(lighterBg));
    root.style.setProperty('--text-disabled', toCss(darkerText));
};