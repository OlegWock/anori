// Runs before the main page script: applies the saved theme pre-paint (avoids a flash) and warms the
// active language's lazily-loaded chunks so the page resolves them from cache.
import { momentLocaleLoaders, translationLoaders } from "@anori/translations/loaders";
import { applyTheme, defaultTheme, resolveColorScheme, themes } from "@anori/utils/user-data/theme-base";
import browser from 'webextension-polyfill';

browser.storage.local.get({
    theme: { value: defaultTheme.name },
    customThemes: { value: [] },
    colorScheme: { value: "dark" },
    language: { value: "en" },
}).then(({ theme, customThemes, colorScheme, language }) => {
    // Warm the active language's chunks (translation + moment locale) now, before the main page script runs,
    // so its dynamic imports resolve from cache.
    const lang = language.value;
    translationLoaders[lang]?.();
    momentLocaleLoaders[lang]?.();

    const themeName = theme.value;
    // `t.accent` guards against a custom theme not yet migrated to the new shape (it'll apply correctly
    // once the schema migration runs); until then fall back to the default theme.
    const activeTheme = [...themes, ...(customThemes.value || [])].find((t) => t.name === themeName && t.accent);
    return applyTheme(activeTheme || defaultTheme, resolveColorScheme(colorScheme.value || "dark"));
});
