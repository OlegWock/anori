import type { ColorScheme, SidebarOrientation } from "@anori/utils/storage";
import type { EmptyObject } from "@anori/utils/types";

type NoParams = EmptyObject;

export type UsageQuantifiableMetrics =
  | "Times new tab opened"
  | "Times hotkey used"
  | "Times navigated to another folder"
  | `Interactions / ${string} / ${string} / ${string}`; // plugin id / widget id / interaction type
export type DailyUsageMetrics = { [key in UsageQuantifiableMetrics]?: number };

export type WidgetsCount = Record<`${"Home" | "Custom"} folder widgets / ${string} / ${string}`, number>;

export type AnalyticEvents = {
  "Usage statistics": {
    "Browser": string;
    "Operational system": string;
    "Extension version": string;
    "Custom icons count": number;
    "Custom folders count": number;
    "Sidebar orientation": SidebarOrientation;
    "Automatically hide sidebar enabled": boolean;
    "Bookmarks bar enabled": boolean;
    "Compact mode": "enabled" | "disabled" | "auto";
    "Open animation enabled": boolean;
    "Language": string;
    "Theme": string;
    "Color mode": ColorScheme;
    "Performance / Avg LCP": number | null;
    "Performance / INP": number | null;
  } & DailyUsageMetrics &
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
