import type { Language } from "@anori/translations/metadata";
import browser from "webextension-polyfill";
import { type CustomTheme, type Folder, type FolderDetails, anoriSchema } from "../anori-schema";
import { type HlcTimestamp, createHlc, generateNodeId } from "../hlc";
import { HLC_STATE_KEY, SCHEMA_VERSION_KEY } from "../keys";
import type { StorageRecord } from "../types";

const LEGACY_STORAGE_VERSION_KEY = "storageVersion";

type LegacyFolderDetails = { widgets: unknown[] };

type LegacyStorageContent = {
  // Core
  folders?: Folder[];
  storageVersion?: number;
  newTabTitle?: string;

  // Appearance
  theme?: string;
  customThemes?: CustomTheme[];

  // Layout
  sidebarOrientation?: "vertical" | "horizontal" | "auto";
  autoHideSidebar?: boolean;
  showBookmarksBar?: boolean;

  // Navigation
  rememberLastFolder?: boolean;
  lastFolder?: string;

  // Display mode
  compactMode?: boolean;
  automaticCompactMode?: boolean;
  automaticCompactModeThreshold?: number;
  showLoadAnimation?: boolean;

  // Localization
  language?: Language;

  // User state
  hasUnreadReleaseNotes?: boolean;
  finishedOnboarding?: boolean;

  // Analytics
  userId?: string;
  analyticsEnabled?: boolean;
  analyticsLastSend?: number;
  dailyUsageMetrics?: Record<string, number>;
  performanceAvgLcp?: { avg: number; n: number };
  performanceRawInp?: number[];

  // Cloud
  cloudAccount?: { sessionToken: string; email: string; userId: string } | null;
};

/**
 * Checks if the storage contains legacy data that needs to be migrated.
 * Legacy storage is identified by having `storageVersion` key but no `__schema_version`.
 */
export async function isLegacyStorage(): Promise<boolean> {
  const data = await browser.storage.local.get([SCHEMA_VERSION_KEY, LEGACY_STORAGE_VERSION_KEY]);
  const newSchemaVersion = data[SCHEMA_VERSION_KEY];
  const legacyVersion = data[LEGACY_STORAGE_VERSION_KEY];

  return newSchemaVersion === undefined && legacyVersion !== undefined;
}

/**
 * Wraps a value in a StorageRecord with an HLC timestamp.
 */
function wrapValue<T>(value: T, hlc: HlcTimestamp, brand?: string): StorageRecord<T> {
  return {
    hlc,
    value,
    deleted: false,
    brand,
  };
}

/**
 * Migrates legacy storage format to the new schema format.
 * This handles the transition from the old `storageVersion` system to the new `__schema_version` system.
 */
export async function migrateFromLegacy(): Promise<void> {
  const allData = (await browser.storage.local.get(null)) as LegacyStorageContent & Record<string, unknown>;

  const hlc = createHlc(generateNodeId());
  const newData: Record<string, unknown> = {};

  // ============================================================================
  // Migrate simple cells
  // ============================================================================

  // Core data
  newData.folders = wrapValue(allData.folders ?? [], hlc.tick());
  newData.newTabTitle = wrapValue(allData.newTabTitle ?? "Anori", hlc.tick());

  // Appearance
  newData.theme = wrapValue(allData.theme ?? "Greenery", hlc.tick());
  newData.customThemes = wrapValue(allData.customThemes ?? [], hlc.tick());

  // Layout
  newData.sidebarOrientation = wrapValue(allData.sidebarOrientation ?? "auto", hlc.tick());
  newData.autoHideSidebar = wrapValue(allData.autoHideSidebar ?? false, hlc.tick());
  newData.showBookmarksBar = wrapValue(allData.showBookmarksBar ?? false, hlc.tick());

  // Navigation
  newData.rememberLastFolder = wrapValue(allData.rememberLastFolder ?? false, hlc.tick());
  if (allData.lastFolder !== undefined) {
    newData.lastFolder = wrapValue(allData.lastFolder, hlc.tick());
  }

  // Display mode
  newData.compactMode = wrapValue(allData.compactMode ?? false, hlc.tick());
  newData.automaticCompactMode = wrapValue(allData.automaticCompactMode ?? true, hlc.tick());
  newData.automaticCompactModeThreshold = wrapValue(allData.automaticCompactModeThreshold ?? 1500, hlc.tick());
  newData.showLoadAnimation = wrapValue(allData.showLoadAnimation ?? false, hlc.tick());

  // Localization
  newData.language = wrapValue(allData.language ?? "en", hlc.tick());

  // User state
  newData.hasUnreadReleaseNotes = wrapValue(allData.hasUnreadReleaseNotes ?? false, hlc.tick());
  newData.finishedOnboarding = wrapValue(allData.finishedOnboarding ?? false, hlc.tick());

  // Analytics
  if (allData.userId) {
    newData.userId = wrapValue(allData.userId, hlc.tick());
  }
  newData.analyticsEnabled = wrapValue(allData.analyticsEnabled ?? false, hlc.tick());
  newData.analyticsLastSend = wrapValue(allData.analyticsLastSend ?? 0, hlc.tick());
  newData.dailyUsageMetrics = wrapValue(allData.dailyUsageMetrics ?? {}, hlc.tick());
  newData.performanceAvgLcp = wrapValue(allData.performanceAvgLcp ?? { avg: 0, n: 0 }, hlc.tick());
  newData.performanceRawInp = wrapValue(allData.performanceRawInp ?? [], hlc.tick());

  // Cloud
  if (allData.cloudAccount !== undefined) {
    newData.cloudAccount = wrapValue(allData.cloudAccount, hlc.tick());
  }

  const keysToDelete = new Set<string>();
  keysToDelete.add(LEGACY_STORAGE_VERSION_KEY);

  // ============================================================================
  // Migrate folder details collection (Folder.{id} -> Folder:{id})
  // ============================================================================

  const folderIds = new Set<string>();
  folderIds.add("home");

  const folders = allData.folders ?? [];
  for (const folder of folders) {
    folderIds.add(folder.id);
  }

  for (const key of Object.keys(allData)) {
    if (key.startsWith("Folder.")) {
      keysToDelete.add(key);
      const id = key.substring("Folder.".length);
      folderIds.add(id);
    }
  }

  for (const folderId of folderIds) {
    const legacyKey = `Folder.${folderId}`;
    const newKey = `Folder:${folderId}`;
    const legacyDetails = allData[legacyKey] as LegacyFolderDetails | undefined;

    const details: FolderDetails = {
      widgets: Array.isArray(legacyDetails?.widgets) ? (legacyDetails.widgets as FolderDetails["widgets"]) : [],
    };

    newData[newKey] = wrapValue(details, hlc.tick(), "FolderDetails");
  }

  // ============================================================================
  // Migrate plugin config collection (PluginConfig.{id} -> PluginConfig:{id})
  // ============================================================================

  for (const key of Object.keys(allData)) {
    if (key.startsWith("PluginConfig.")) {
      const id = key.substring("PluginConfig.".length);
      const newKey = `PluginConfig:${id}`;
      newData[newKey] = wrapValue(allData[key], hlc.tick(), "PluginConfig");
    }
  }

  // ============================================================================
  // Migrate widget storage collection (WidgetStorage.{id} -> WidgetStorage:{id})
  // ============================================================================

  for (const key of Object.keys(allData)) {
    if (key.startsWith("WidgetStorage.")) {
      keysToDelete.add(key);
      const id = key.substring("WidgetStorage.".length);
      const newKey = `WidgetStorage:${id}`;
      newData[newKey] = wrapValue(allData[key], hlc.tick(), "WidgetStorage");
    }
  }

  // ============================================================================
  // Migrate plugin storage collection (PluginStorage.{id} -> PluginStorage:{id})
  // ============================================================================

  for (const key of Object.keys(allData)) {
    if (key.startsWith("PluginStorage.")) {
      keysToDelete.add(key);
      const id = key.substring("PluginStorage.".length);
      const newKey = `PluginStorage:${id}`;
      newData[newKey] = wrapValue(allData[key], hlc.tick(), "PluginStorage");
    }
  }

  // ============================================================================
  // Finalize migration
  // ============================================================================

  // Store HLC state
  newData[HLC_STATE_KEY] = hlc.getState();

  // Set the new schema version
  newData[SCHEMA_VERSION_KEY] = anoriSchema.currentVersion;

  await browser.storage.local.set(newData);
  await browser.storage.local.remove([...keysToDelete]);

  console.log(
    `[Storage] Migrated from legacy storage (v${allData.storageVersion ?? 0}) to schema v${anoriSchema.currentVersion}`,
  );
}
