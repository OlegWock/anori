import browser from 'webextension-polyfill';
import { applyTheme, defaultTheme, themes } from "@anori/utils/user-data/theme";

browser.storage.local.get({ theme: defaultTheme.name, customThemes: {value: []} }).then(({ theme: themeName, customThemes }) => {
    if (!customThemes.value) {
        return;
    }
    const theme = [...themes, ...customThemes.value].find(t => t.name === themeName);
    return applyTheme(theme || defaultTheme);
});