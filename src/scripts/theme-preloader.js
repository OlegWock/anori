import browser from 'webextension-polyfill';
import { applyTheme, defaultTheme, themes } from "@anori/utils/user-data/theme";

browser.storage.local.get({ theme: {value: defaultTheme.name}, customThemes: {value: []} }).then(({ theme, customThemes }) => {
    const themeName = theme.value;
    const activeTheme = [...themes, ...(customThemes.value || [])].find(t => t.name === themeName);
    return applyTheme(activeTheme || defaultTheme);
});