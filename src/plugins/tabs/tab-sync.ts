import { getApiClient } from "@anori/cloud-integration/api-client";
import { type AnoriStorage, anoriSchema, getAnoriStorage } from "@anori/utils/storage";
import browser from "webextension-polyfill";
import { supportsTabGroups } from "./capture";
import { buildSnapshotTabs, type SnapshotTab, TabSyncController, type TabSyncEnvironment } from "./tab-sync-controller";

function subscribeEvent<Args extends unknown[]>(
  event: { addListener: (cb: (...args: Args) => void) => void; removeListener: (cb: (...args: Args) => void) => void },
  handler: (...args: Args) => void,
): () => void {
  event.addListener(handler);
  return () => event.removeListener(handler);
}

function registerTabChangeListeners(onChange: () => void): () => void {
  const cleanups: Array<() => void> = [];

  const onUpdated = (_tabId: number, changeInfo: browser.Tabs.OnUpdatedChangeInfoType) => {
    if (
      changeInfo.url !== undefined ||
      changeInfo.title !== undefined ||
      changeInfo.pinned !== undefined ||
      changeInfo.status === "complete"
    ) {
      onChange();
    }
  };
  browser.tabs.onUpdated.addListener(onUpdated);
  cleanups.push(() => browser.tabs.onUpdated.removeListener(onUpdated));

  cleanups.push(
    subscribeEvent(browser.tabs.onCreated, () => onChange()),
    subscribeEvent(browser.tabs.onRemoved, () => onChange()),
    subscribeEvent(browser.tabs.onActivated, () => onChange()),
    subscribeEvent(browser.tabs.onMoved, () => onChange()),
    subscribeEvent(browser.tabs.onAttached, () => onChange()),
    subscribeEvent(browser.tabs.onDetached, () => onChange()),
  );

  if (supportsTabGroups()) {
    cleanups.push(
      subscribeEvent(browser.tabGroups.onCreated, () => onChange()),
      subscribeEvent(browser.tabGroups.onUpdated, () => onChange()),
      subscribeEvent(browser.tabGroups.onRemoved, () => onChange()),
      subscribeEvent(browser.tabGroups.onMoved, () => onChange()),
    );
  }

  return () => {
    for (const cleanup of cleanups) cleanup();
  };
}

async function queryTabGroups(): Promise<Map<number, browser.TabGroups.TabGroup>> {
  const byId = new Map<number, browser.TabGroups.TabGroup>();
  if (!supportsTabGroups()) return byId;
  const groups = await browser.tabGroups.query({});
  for (const group of groups) byId.set(group.id, group);
  return byId;
}

export function createBrowserTabSyncEnvironment(storage: AnoriStorage): TabSyncEnvironment {
  return {
    isEnabled: () => storage.get(anoriSchema.shareOpenTabs) ?? false,
    isConnected: () => !!storage.get(anoriSchema.cloudAccount),
    subscribeEnabled: (listener) => storage.subscribe(anoriSchema.shareOpenTabs, (value) => listener(value ?? false)),
    subscribeConnected: (listener) => storage.subscribe(anoriSchema.cloudAccount, (value) => listener(!!value)),
    addTabChangeListeners: (onChange) => registerTabChangeListeners(onChange),
    buildSnapshot: async () => {
      const [tabs, groupsById] = await Promise.all([browser.tabs.query({}), queryTabGroups()]);
      return buildSnapshotTabs(tabs, groupsById);
    },
    pushSnapshot: async (tabs: SnapshotTab[]) => {
      await getApiClient().tabs.pushSnapshot.mutate({ tabs });
    },
    clearSnapshot: async () => {
      await getApiClient().tabs.clearSnapshot.mutate();
    },
  };
}

let controller: TabSyncController | null = null;

export async function startTabSync(): Promise<void> {
  if (controller) return;
  const storage = await getAnoriStorage();
  controller = new TabSyncController(createBrowserTabSyncEnvironment(storage));
  controller.start();
}
