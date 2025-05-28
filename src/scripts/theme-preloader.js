import browser from 'webextension-polyfill';
import { applyTheme, defaultTheme, themes } from "@anori/utils/user-data/theme";

browser.storage.local.get({ theme: defaultTheme.name, customThemes: [] }).then(({ theme: themeName, customThemes }) => {
    const theme = [...themes, ...customThemes].find(t => t.name === themeName);
    return applyTheme(theme || defaultTheme);
});