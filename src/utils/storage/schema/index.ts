import { availableTranslations, type Language } from "@anori/translations/metadata";
import { type HslColor, hslColorToOklch } from "@anori/utils/color";
import {
  BookmarkWidgetStoreSchema,
  NotesWidgetStoreSchema,
  RssWidgetStoreSchema,
  TasksWidgetStoreSchema,
  TopSitesWidgetStoreSchema,
  WeatherCurrentWidgetStoreSchema,
  WeatherForecastWidgetStoreSchema,
} from "@anori/utils/storage/schema/widget-store";
import {
  cell,
  collection,
  createMigration,
  defineSchemaVersion,
  defineVersionedSchema,
  entity,
  fileCollection,
} from "@anori/utils/storage-lib/schema";
import { z } from "zod";

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

const HslColorSchema: z.ZodType<HslColor> = z.object({
  hue: z.number(),
  saturation: z.number(),
  lightness: z.number(),
  alpha: z.number(),
});

const CustomThemeSchemaV1 = z.object({
  name: z.string(),
  type: z.literal("custom"),
  blur: z.number(),
  colors: z.object({
    accent: HslColorSchema,
    background: HslColorSchema,
    text: HslColorSchema,
  }),
});

const OklchColorSchema = z.object({ l: z.number(), c: z.number(), h: z.number() });

const CustomThemeSchema = z.object({
  name: z.string(),
  type: z.literal("custom"),
  blur: z.number(),
  accent: OklchColorSchema,
});

export type CustomTheme = z.infer<typeof CustomThemeSchema>;

const ColorSchemeSchema = z.enum(["light", "dark", "system"]);
export type ColorScheme = z.infer<typeof ColorSchemeSchema>;

const SidebarOrientationSchema = z.enum(["vertical", "horizontal", "auto"]);
export type SidebarOrientation = z.infer<typeof SidebarOrientationSchema>;

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
    includedInBackup: true,
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
    includedInBackup: true,
  }),
  newTabTitle: cell({
    key: "newTabTitle",
    schema: z.string(),
    defaultValue: "Anori",
    tracked: true,
    includedInBackup: true,
  }),

  // Appearance settings
  theme: cell({
    key: "theme",
    schema: z.string(),
    defaultValue: "Greenery",
    tracked: true,
    includedInBackup: true,
  }),
  customThemes: cell({
    key: "customThemes",
    schema: z.array(CustomThemeSchemaV1),
    defaultValue: [],
    tracked: true,
    includedInBackup: true,
  }),

  // Layout settings
  sidebarOrientation: cell({
    key: "sidebarOrientation",
    schema: SidebarOrientationSchema,
    defaultValue: "auto" as const,
    tracked: true,
    includedInBackup: true,
  }),
  autoHideSidebar: cell({
    key: "autoHideSidebar",
    schema: z.boolean(),
    defaultValue: false,
    tracked: true,
    includedInBackup: true,
  }),
  showBookmarksBar: cell({
    key: "showBookmarksBar",
    schema: z.boolean(),
    defaultValue: false,
    tracked: true,
    includedInBackup: true,
  }),

  // Navigation settings
  rememberLastFolder: cell({
    key: "rememberLastFolder",
    schema: z.boolean(),
    defaultValue: false,
    tracked: true,
    includedInBackup: true,
  }),
  lastFolder: cell({
    key: "lastFolder",
    schema: z.string().optional(),
    defaultValue: undefined,
    tracked: false,
    includedInBackup: true,
  }),

  // Display mode settings
  compactMode: cell({
    key: "compactMode",
    schema: z.boolean(),
    defaultValue: false,
    tracked: true,
    includedInBackup: true,
  }),
  automaticCompactMode: cell({
    key: "automaticCompactMode",
    schema: z.boolean(),
    defaultValue: true,
    tracked: true,
    includedInBackup: true,
  }),
  automaticCompactModeThreshold: cell({
    key: "automaticCompactModeThreshold",
    schema: z.number(),
    defaultValue: 1500,
    tracked: false,
    includedInBackup: true,
  }),
  showLoadAnimation: cell({
    key: "showLoadAnimation",
    schema: z.boolean(),
    defaultValue: false,
    tracked: true,
    includedInBackup: true,
  }),

  // Localization
  language: cell({
    key: "language",
    schema: LanguageSchema,
    defaultValue: "en" as Language,
    tracked: true,
    includedInBackup: true,
  }),

  // User state (not synced)
  hasUnreadReleaseNotes: cell({
    key: "hasUnreadReleaseNotes",
    schema: z.boolean(),
    defaultValue: false,
    tracked: false,
    includedInBackup: true,
  }),
  finishedOnboarding: cell({
    key: "finishedOnboarding",
    schema: z.boolean(),
    defaultValue: false,
    tracked: false,
    includedInBackup: true,
  }),

  // Analytics (not synced)
  userId: cell({
    key: "userId",
    schema: z.string(),
    defaultValue: "",
    tracked: false,
    includedInBackup: true,
  }),
  analyticsEnabled: cell({
    key: "analyticsEnabled",
    schema: z.boolean(),
    defaultValue: false,
    tracked: false,
    includedInBackup: true,
  }),
  analyticsLastSend: cell({
    key: "analyticsLastSend",
    schema: z.number(),
    defaultValue: 0,
    tracked: false,
    includedInBackup: true,
  }),
  dailyUsageMetrics: cell({
    key: "dailyUsageMetrics",
    schema: DailyUsageMetricsSchema,
    defaultValue: {},
    tracked: false,
    includedInBackup: true,
  }),
  performanceAvgLcp: cell({
    key: "performanceAvgLcp",
    schema: PerformanceAvgLcpSchema,
    defaultValue: { avg: 0, n: 0 },
    tracked: false,
    includedInBackup: true,
  }),
  performanceRawInp: cell({
    key: "performanceRawInp",
    schema: z.array(z.number()),
    defaultValue: [],
    tracked: false,
    includedInBackup: true,
  }),

  // Cloud integration (not synced)
  cloudAccount: cell({
    key: "cloudAccount",
    schema: CloudAccountSchema,
    defaultValue: null,
    tracked: false,
    includedInBackup: false,
  }),
  cloudSyncSettings: cell({
    key: "cloudSyncSettings",
    schema: z
      .object({
        profileId: z.string(),
        latestSeq: z.number(),
      })
      .nullable(),
    defaultValue: null,
    tracked: false,
    includedInBackup: false,
  }),

  // Plugin storage collections
  pluginConfig: collection({
    keyPrefix: "PluginConfig",
    entities: {
      config: entity({
        brand: "PluginConfig",
        schema: z.record(z.string(), z.unknown()),
      }),
    },
    tracked: true,
    includedInBackup: true,
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
    includedInBackup: true,
  }),

  // Widget-specific stores
  tasksWidgetStore: collection({
    keyPrefix: "TasksWidgetStore",
    entities: {
      store: entity({
        brand: "TasksWidgetStore",
        schema: TasksWidgetStoreSchema,
      }),
    },
    tracked: true,
    includedInBackup: true,
  }),
  notesWidgetStore: collection({
    keyPrefix: "NotesWidgetStore",
    entities: {
      store: entity({
        brand: "NotesWidgetStore",
        schema: NotesWidgetStoreSchema,
      }),
    },
    tracked: true,
    includedInBackup: true,
  }),
  weatherCurrentWidgetStore: collection({
    keyPrefix: "WeatherCurrentWidgetStore",
    entities: {
      store: entity({
        brand: "WeatherCurrentWidgetStore",
        schema: WeatherCurrentWidgetStoreSchema,
      }),
    },
    tracked: true,
    includedInBackup: true,
  }),
  weatherForecastWidgetStore: collection({
    keyPrefix: "WeatherForecastWidgetStore",
    entities: {
      store: entity({
        brand: "WeatherForecastWidgetStore",
        schema: WeatherForecastWidgetStoreSchema,
      }),
    },
    tracked: true,
    includedInBackup: true,
  }),
  topSitesWidgetStore: collection({
    keyPrefix: "TopSitesWidgetStore",
    entities: {
      store: entity({
        brand: "TopSitesWidgetStore",
        schema: TopSitesWidgetStoreSchema,
      }),
    },
    tracked: true,
    includedInBackup: true,
  }),
  rssWidgetStore: collection({
    keyPrefix: "RssWidgetStore",
    entities: {
      store: entity({
        brand: "RssWidgetStore",
        schema: RssWidgetStoreSchema,
      }),
    },
    tracked: true,
    includedInBackup: true,
  }),
  bookmarkWidgetStore: collection({
    keyPrefix: "BookmarkWidgetStore",
    entities: {
      store: entity({
        brand: "BookmarkWidgetStore",
        schema: BookmarkWidgetStoreSchema,
      }),
    },
    tracked: false,
    includedInBackup: true,
  }),

  // File collections
  customIcons: fileCollection({
    keyPrefix: "CustomIcon",
    tracked: true,
    includedInBackup: true,
    propertiesSchema: z.object({
      mimeType: z.string().optional(),
    }),
  }),
  themeBackgrounds: fileCollection({
    keyPrefix: "ThemeBackground",
    tracked: true,
    includedInBackup: true,
  }),
  pictureWidgetImages: fileCollection({
    keyPrefix: "PictureWidgetImage",
    tracked: true,
    includedInBackup: true,
    propertiesSchema: z.object({
      mimeType: z.string().optional(),
    }),
  }),
});

export type AnoriSchemaV1 = typeof schemaV1.definition;

export const schemaV2 = defineSchemaVersion(2, {
  ...schemaV1.definition,
  customThemes: cell({
    key: "customThemes",
    schema: z.array(CustomThemeSchema),
    defaultValue: [],
    tracked: true,
    includedInBackup: true,
  }),
  colorScheme: cell({
    key: "colorScheme",
    schema: ColorSchemeSchema,
    defaultValue: "dark" as const,
    tracked: true,
    includedInBackup: true,
  }),
});

export type AnoriSchemaV2 = typeof schemaV2.definition;

const migrateV1ToV2 = createMigration(schemaV1, schemaV2, async (ctx) => {
  const oldThemes = ctx.from.get(ctx.from.schema.customThemes) ?? [];
  ctx.to.set(
    ctx.to.schema.customThemes,
    oldThemes.map((t) => ({
      name: t.name,
      type: "custom" as const,
      blur: t.blur,
      accent: hslColorToOklch(t.colors.accent),
    })),
  );
});

export const anoriVersionedSchema = defineVersionedSchema({
  versions: [schemaV1, schemaV2],
  migrations: [migrateV1ToV2],
});

// latestSchema is typed as the union of all versions; the runtime value is the latest (v2).
export const anoriSchema = anoriVersionedSchema.latestSchema.definition as AnoriSchemaV2;

export type {
  BookmarkWidgetStore,
  NotesWidgetStore,
  RssFeed,
  RssPost,
  RssWidgetStore,
  Task,
  TasksWidgetStore,
  TopSitesWidgetStore,
  WeatherCurrentWidgetStore,
  WeatherForecastWidgetStore,
} from "./widget-store";
