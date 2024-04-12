import { useBrowserStorageValue } from "@utils/storage/api";
import { defaultTheme, themes } from "./theme";

export const useCurrentTheme = () => {
    const [theme, setTheme] = useBrowserStorageValue('theme', defaultTheme.name);
    const [customThemes] = useBrowserStorageValue('customThemes', []);

    return [
        [...themes, ...customThemes].find(t => t.name === theme)!,
        setTheme
    ] as const;
};