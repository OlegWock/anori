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
    sync: "profile",
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
    sync: "profile",
    includedInBackup: true,
  }),
  newTabTitle: cell({
    key: "newTabTitle",
    schema: z.string(),
    defaultValue: "Anori",
    sync: "profile",
    includedInBackup: true,
  }),

  // Appearance settings
  theme: cell({
    key: "theme",
    schema: z.string(),
    defaultValue: "Greenery",
    sync: "profile",
    includedInBackup: true,
  }),
  customThemes: cell({
    key: "customThemes",
    schema: z.array(CustomThemeSchemaV1),
    defaultValue: [],
    sync: "profile",
    includedInBackup: true,
  }),

  // Layout settings
  sidebarOrientation: cell({
    key: "sidebarOrientation",
    schema: SidebarOrientationSchema,
    defaultValue: "auto" as const,
    sync: "profile",
    includedInBackup: true,
  }),
  autoHideSidebar: cell({
    key: "autoHideSidebar",
    schema: z.boolean(),
    defaultValue: false,
    sync: "profile",
    includedInBackup: true,
  }),
  showBookmarksBar: cell({
    key: "showBookmarksBar",
    schema: z.boolean(),
    defaultValue: false,
    sync: "profile",
    includedInBackup: true,
  }),

  // Navigation settings
  rememberLastFolder: cell({
    key: "rememberLastFolder",
    schema: z.boolean(),
    defaultValue: false,
    sync: "profile",
    includedInBackup: true,
  }),
  lastFolder: cell({
    key: "lastFolder",
    schema: z.string().optional(),
    defaultValue: undefined,
    sync: "off",
    includedInBackup: true,
  }),

  // Display mode settings
  compactMode: cell({
    key: "compactMode",
    schema: z.boolean(),
    defaultValue: false,
    sync: "profile",
    includedInBackup: true,
  }),
  automaticCompactMode: cell({
    key: "automaticCompactMode",
    schema: z.boolean(),
    defaultValue: true,
    sync: "profile",
    includedInBackup: true,
  }),
  automaticCompactModeThreshold: cell({
    key: "automaticCompactModeThreshold",
    schema: z.number(),
    defaultValue: 1500,
    sync: "off",
    includedInBackup: true,
  }),
  showLoadAnimation: cell({
    key: "showLoadAnimation",
    schema: z.boolean(),
    defaultValue: false,
    sync: "profile",
    includedInBackup: true,
  }),

  // Localization
  language: cell({
    key: "language",
    schema: LanguageSchema,
    defaultValue: "en" as Language,
    sync: "profile",
    includedInBackup: true,
  }),

  // User state (not synced)
  hasUnreadReleaseNotes: cell({
    key: "hasUnreadReleaseNotes",
    schema: z.boolean(),
    defaultValue: false,
    sync: "off",
    includedInBackup: true,
  }),
  finishedOnboarding: cell({
    key: "finishedOnboarding",
    schema: z.boolean(),
    defaultValue: false,
    sync: "off",
    includedInBackup: true,
  }),

  // Analytics (not synced)
  userId: cell({
    key: "userId",
    schema: z.string(),
    defaultValue: "",
    sync: "off",
    includedInBackup: true,
  }),
  analyticsEnabled: cell({
    key: "analyticsEnabled",
    schema: z.boolean(),
    defaultValue: false,
    sync: "off",
    includedInBackup: true,
  }),
  analyticsLastSend: cell({
    key: "analyticsLastSend",
    schema: z.number(),
    defaultValue: 0,
    sync: "off",
    includedInBackup: true,
  }),
  dailyUsageMetrics: cell({
    key: "dailyUsageMetrics",
    schema: DailyUsageMetricsSchema,
    defaultValue: {},
    sync: "off",
    includedInBackup: true,
  }),
  performanceAvgLcp: cell({
    key: "performanceAvgLcp",
    schema: PerformanceAvgLcpSchema,
    defaultValue: { avg: 0, n: 0 },
    sync: "off",
    includedInBackup: true,
  }),
  performanceRawInp: cell({
    key: "performanceRawInp",
    schema: z.array(z.number()),
    defaultValue: [],
    sync: "off",
    includedInBackup: true,
  }),

  // Cloud integration (not synced)
  cloudAccount: cell({
    key: "cloudAccount",
    schema: CloudAccountSchema,
    defaultValue: null,
    sync: "off",
    includedInBackup: false,
  }),
  cloudSyncSettings: cell({
    key: "cloudSyncSettings",
    schema: z
      .object({
        profileId: z.string(),
        latestSeq: z.number(),
        // Observed current schema version of the cloud profile.
        profileSchemaVersion: z.number().optional(),
        // Cloud schema version our local data is reconciled to.
        syncedSchemaVersion: z.number().optional(),
      })
      .nullable(),
    defaultValue: null,
    sync: "off",
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
    sync: "profile",
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
    sync: "profile",
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
    sync: "profile",
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
    sync: "profile",
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
    sync: "profile",
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
    sync: "profile",
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
    sync: "profile",
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
    sync: "profile",
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
    sync: "off",
    includedInBackup: true,
  }),

  // File collections
  customIcons: fileCollection({
    keyPrefix: "CustomIcon",
    sync: "profile",
    includedInBackup: true,
    propertiesSchema: z.object({
      mimeType: z.string().optional(),
    }),
  }),
  themeBackgrounds: fileCollection({
    keyPrefix: "ThemeBackground",
    sync: "profile",
    includedInBackup: true,
  }),
  pictureWidgetImages: fileCollection({
    keyPrefix: "PictureWidgetImage",
    sync: "profile",
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
    sync: "profile",
    includedInBackup: true,
  }),
  colorScheme: cell({
    key: "colorScheme",
    schema: ColorSchemeSchema,
    defaultValue: "dark" as const,
    sync: "profile",
    includedInBackup: true,
  }),

  // Example account-global cell exercising the user sync scope end to end.
  testUserNote: cell({
    key: "testUserNote",
    schema: z.string(),
    defaultValue: "",
    sync: "user",
    includedInBackup: false,
  }),

  // User-scope sync cursor/version state. Deliberately separate from cloudSyncSettings: user
  // cells are account-global, so this must survive profile switches.
  cloudUserSyncState: cell({
    key: "cloudUserSyncState",
    schema: z
      .object({
        latestSeq: z.number(),
        // Observed schema version of the account's user-cell store.
        userSchemaVersion: z.number().optional(),
        // User-store schema version our local user cells are reconciled to.
        syncedSchemaVersion: z.number().optional(),
        // Which account the local user-scope data was last synced against. Survives logout so
        // a later login can tell "same account, resume" from "different account, ask what to
        // do with the local copy".
        ownerUserId: z.string().optional(),
      })
      .nullable(),
    defaultValue: null,
    sync: "off",
    includedInBackup: false,
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

export const anoriSchema = anoriVersionedSchema.latestSchema.definition;

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
