import browser from 'webextension-polyfill';
import { applyTheme, defaultTheme, resolveColorScheme, themes } from "@anori/utils/user-data/theme-base";

browser.storage.local.get({
    theme: { value: defaultTheme.name },
    customThemes: { value: [] },
    colorScheme: { value: "dark" },
}).then(({ theme, customThemes, colorScheme }) => {
    const themeName = theme.value;
    // `t.accent` guards against a custom theme not yet migrated to the new shape (it'll apply correctly
    // once the schema migration runs); until then fall back to the default theme.
    const activeTheme = [...themes, ...(customThemes.value || [])].find((t) => t.name === themeName && t.accent);
    return applyTheme(activeTheme || defaultTheme, resolveColorScheme(colorScheme.value || "dark"));
});
