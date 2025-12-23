import { type Language, availableTranslations } from "@anori/translations/index";
import type { Color } from "@anori/utils/color";
import { z } from "zod";
import { cell, collection, defineSchemaVersion, defineVersionedSchema, entity } from "./schema";

// ============================================================================
// Zod Schemas
// ============================================================================

const FolderSchema = z.object({
  id: z.string(),
  name: z.string(),
  icon: z.string(),
});

export type Folder = z.infer<typeof FolderSchema>;

const WidgetInFolderSchema = z.object({
  pluginId: z.string(),
  widgetId: z.string(),
  instanceId: z.string(),
  configuration: z.record(z.string(), z.unknown()),
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
});

const FolderDetailsSchema = z.object({
  widgets: z.array(WidgetInFolderSchema),
});

export type FolderDetails = z.infer<typeof FolderDetailsSchema>;

const ColorSchema: z.ZodType<Color> = z.object({
  hue: z.number(),
  saturation: z.number(),
  lightness: z.number(),
  alpha: z.number(),
});

const CustomThemeSchema = z.object({
  name: z.string(),
  type: z.literal("custom"),
  blur: z.number(),
  colors: z.object({
    accent: ColorSchema,
    background: ColorSchema,
    text: ColorSchema,
  }),
});

export type CustomTheme = z.infer<typeof CustomThemeSchema>;

const SidebarOrientationSchema = z.enum(["vertical", "horizontal", "auto"]);

const LanguageSchema: z.ZodType<Language> = z.enum(availableTranslations);

const DailyUsageMetricsSchema = z.record(z.string(), z.number());

const PerformanceAvgLcpSchema = z.object({
  avg: z.number(),
  n: z.number(),
});

const CloudAccountSchema = z
  .object({
    sessionToken: z.string(),
    email: z.string(),
    userId: z.string(),
  })
  .nullable();

// ============================================================================
// Schema Definition
// ============================================================================

export const schemaV1 = defineSchemaVersion(1, {
  // Core data
  folders: cell({
    key: "folders",
    schema: z.array(FolderSchema),
    defaultValue: [],
    tracked: true,
  }),
  folderDetails: collection({
    keyPrefix: "Folder",
    entities: {
      folder: entity({
        brand: "FolderDetails",
        schema: FolderDetailsSchema,
      }),
    },
    tracked: true,
  }),
  newTabTitle: cell({
    key: "newTabTitle",
    schema: z.string(),
    defaultValue: "Anori",
    tracked: true,
  }),

  // Appearance settings
  theme: cell({
    key: "theme",
    schema: z.string(),
    defaultValue: "Greenery",
    tracked: true,
  }),
  customThemes: cell({
    key: "customThemes",
    schema: z.array(CustomThemeSchema),
    defaultValue: [],
    tracked: true,
  }),

  // Layout settings
  sidebarOrientation: cell({
    key: "sidebarOrientation",
    schema: SidebarOrientationSchema,
    defaultValue: "auto" as const,
    tracked: true,
  }),
  autoHideSidebar: cell({
    key: "autoHideSidebar",
    schema: z.boolean(),
    defaultValue: false,
    tracked: true,
  }),
  showBookmarksBar: cell({
    key: "showBookmarksBar",
    schema: z.boolean(),
    defaultValue: false,
    tracked: true,
  }),

  // Navigation settings
  rememberLastFolder: cell({
    key: "rememberLastFolder",
    schema: z.boolean(),
    defaultValue: false,
    tracked: true,
  }),
  lastFolder: cell({
    key: "lastFolder",
    schema: z.string().optional(),
    defaultValue: undefined,
    tracked: false,
  }),

  // Display mode settings
  compactMode: cell({
    key: "compactMode",
    schema: z.boolean(),
    defaultValue: false,
    tracked: true,
  }),
  automaticCompactMode: cell({
    key: "automaticCompactMode",
    schema: z.boolean(),
    defaultValue: true,
    tracked: true,
  }),
  automaticCompactModeThreshold: cell({
    key: "automaticCompactModeThreshold",
    schema: z.number(),
    defaultValue: 1500,
    tracked: true,
  }),
  showLoadAnimation: cell({
    key: "showLoadAnimation",
    schema: z.boolean(),
    defaultValue: false,
    tracked: true,
  }),

  // Localization
  language: cell({
    key: "language",
    schema: LanguageSchema,
    defaultValue: "en" as Language,
    tracked: true,
  }),

  // User state (not synced)
  hasUnreadReleaseNotes: cell({
    key: "hasUnreadReleaseNotes",
    schema: z.boolean(),
    defaultValue: false,
    tracked: false,
  }),
  finishedOnboarding: cell({
    key: "finishedOnboarding",
    schema: z.boolean(),
    defaultValue: false,
    tracked: false,
  }),

  // Analytics (not synced)
  userId: cell({
    key: "userId",
    schema: z.string(),
    defaultValue: "",
    tracked: false,
  }),
  analyticsEnabled: cell({
    key: "analyticsEnabled",
    schema: z.boolean(),
    defaultValue: false,
    tracked: false,
  }),
  analyticsLastSend: cell({
    key: "analyticsLastSend",
    schema: z.number(),
    defaultValue: 0,
    tracked: false,
  }),
  dailyUsageMetrics: cell({
    key: "dailyUsageMetrics",
    schema: DailyUsageMetricsSchema,
    defaultValue: {},
    tracked: false,
  }),
  performanceAvgLcp: cell({
    key: "performanceAvgLcp",
    schema: PerformanceAvgLcpSchema,
    defaultValue: { avg: 0, n: 0 },
    tracked: false,
  }),
  performanceRawInp: cell({
    key: "performanceRawInp",
    schema: z.array(z.number()),
    defaultValue: [],
    tracked: false,
  }),

  // Cloud integration (not synced)
  cloudAccount: cell({
    key: "cloudAccount",
    schema: CloudAccountSchema,
    defaultValue: null,
    tracked: false,
  }),

  // Plugin/Widget storage collections
  pluginConfig: collection({
    keyPrefix: "PluginConfig",
    entities: {
      config: entity({
        brand: "PluginConfig",
        schema: z.record(z.string(), z.unknown()),
      }),
    },
    tracked: true,
  }),
  widgetStorage: collection({
    keyPrefix: "WidgetStorage",
    entities: {
      storage: entity({
        brand: "WidgetStorage",
        schema: z.record(z.string(), z.unknown()),
      }),
    },
    tracked: true,
  }),
  pluginStorage: collection({
    keyPrefix: "PluginStorage",
    entities: {
      storage: entity({
        brand: "PluginStorage",
        schema: z.record(z.string(), z.unknown()),
      }),
    },
    tracked: true,
  }),
});

export const anoriSchema = defineVersionedSchema({
  versions: [schemaV1],
  migrations: [],
});

export type AnoriSchemaV1 = typeof schemaV1.definition;
