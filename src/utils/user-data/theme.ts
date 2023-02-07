import { setPageBackground } from "@utils/mount";
import { darken, lighten, transparentize } from "polished";
import browser from 'webextension-polyfill';

export type Theme = {
    name: string,
    background: string,
    colors: {
        accent: string,
        background: string,
        text: string,
    },
};

export const themes: Theme[] = [
    {
        name: 'Greenery',
        background: 'greenery.jpg',
        colors: {
            accent: '#2eb46a',
            text: '#ffffff',
            background: '#124737',
        }
    },
    {
        name: 'Forest lake',
        background: 'forest-lake.jpg',
        colors: {
            accent: '#4fc6e6',
            text: '#ffffff',
            background: '#0c4866',
        }
    },
    {
        name: 'Mountains',
        background: 'mountains.jpg',
        colors: {
            accent: '#0070C8',
            text: '#ffffff',
            background: '#033e65',
        }
    },
    {
        name: 'Sakura',
        background: 'sakura.jpg',
        colors: {
            accent: '#E0A3C5',
            text: '#ffffff',
            background: '#954c68',
        }
    },
    {
        name: 'Sunflowers',
        background: 'sunflowers.jpg',
        colors: {
            accent: '#2C7691',
            text: '#ffffff',
            background: '#213B47',
        }
    },
    {
        name: 'Hygge',
        background: 'table.jpg',
        colors: {
            accent: '#93918D',
            text: '#ffffff',
            background: '#453E39',
        }
    },
];

export const defaultTheme = themes[0];

export const applyTheme = (theme: Theme) => {
    setPageBackground(browser.runtime.getURL(`/assets/images/backgrounds/${theme.background}`));

    const root = document.documentElement;
    root.style.setProperty('--background-image', `url('/assets/images/backgrounds/${theme.background}')`);
    root.style.setProperty('--accent', theme.colors.accent);
    root.style.setProperty('--accent-subtle', transparentize(0.5, theme.colors.accent));
    root.style.setProperty('--background', theme.colors.background);
    root.style.setProperty('--background-lighter', lighten(0.05, theme.colors.background));
    root.style.setProperty('--text', theme.colors.text);
    root.style.setProperty('--text-subtle-1', transparentize(0.15, theme.colors.text));
    root.style.setProperty('--text-subtle-2', transparentize(0.35, theme.colors.text));
    root.style.setProperty('--text-disabled', darken(0.45, theme.colors.text));
};