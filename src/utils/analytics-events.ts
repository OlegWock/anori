import type { StorageContent } from "@anori/utils/user-data/types";

type NoParams = Record<string, never>;

export type WidgetsCount = Record<`${"Home" | "Custom"} folder widgets / ${string} / ${string}`, number>;

export type AnalyticEvents = {
  "Usage statistics": {
    "Browser": string;
    "Operational system": string;
    "Extension version": string;
    "Custom icons count": number;
    "Custom folders count": number;
    "Sidebar orientation": StorageContent["sidebarOrientation"];
    "Automatically hide sidebar enabled": boolean;
    "Bookmarks bar enabled": boolean;
    "Focus stealer enabled": boolean;
    "Compact mode": "enabled" | "disabled" | "auto";
    "Open animation enabled": boolean;
    "Edit folder button hidden": boolean;
    "Language": string;
    "Theme": string;
    "Performance / Avg LCP": number | null;
    "Performance / INP": number | null;
  } & StorageContent["dailyUsageMetrics"] &
    WidgetsCount;
  "Configuration imported": NoParams;
  "Configuration exported": NoParams;
  "Widget added": {
    "Folder": "home" | "other";
    "Plugin ID": string;
    "Widget ID": string;
  };
  "Widget removed": {
    "Folder": "home" | "other";
    "Plugin ID": string;
    "Widget ID": string;
  };
  "Widget configuration edited": {
    "Folder": "home" | "other";
    "Plugin ID": string;
    "Widget ID": string;
  };
  "Widget resized": {
    "Folder": "home" | "other";
    "Plugin ID": string;
    "Widget ID": string;
  };
  "Widget moved": {
    "Folder": "home" | "other";
    "To another folder": boolean;
    "Plugin ID": string;
    "Widget ID": string;
  };
  "Folder created": NoParams;
  "Folder deleted": NoParams;
};
