import { getApiClient } from "@anori/cloud-integration/api-client";
import { type AnoriStorage, anoriSchema, getAnoriStorage } from "@anori/utils/storage";
import type { DebouncedFunc } from "lodash";
import debounce from "lodash/debounce";
import browser from "webextension-polyfill";
import { supportsTabGroups } from "./capture";
import { buildSnapshotTabs } from "./snapshot";

const DEBOUNCE_MS = 5000;
const MAX_WAIT_MS = 30000;

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

class TabSyncController {
  private started = false;
  private active = false;
  private removeTabListeners: (() => void) | null = null;
  private readonly subscriptions: Array<() => void> = [];
  private readonly debouncedPush: DebouncedFunc<() => void>;

  constructor(private readonly storage: AnoriStorage) {
    this.debouncedPush = debounce(() => this.pushNow(), DEBOUNCE_MS, { maxWait: MAX_WAIT_MS });
  }

  start(): void {
    if (this.started) return;
    this.started = true;
    this.subscriptions.push(
      this.storage.subscribe(anoriSchema.shareOpenTabs, (enabled) => this.handleEnabledChange(enabled ?? false)),
      this.storage.subscribe(anoriSchema.cloudAccount, (account) => this.handleConnectedChange(!!account)),
    );
    this.reconcile();
  }

  private isEnabled(): boolean {
    return this.storage.get(anoriSchema.shareOpenTabs) ?? false;
  }

  private isConnected(): boolean {
    return !!this.storage.get(anoriSchema.cloudAccount);
  }

  private handleEnabledChange(enabled: boolean): void {
    if (enabled) this.reconcile();
    else this.deactivate(true);
  }

  private handleConnectedChange(connected: boolean): void {
    if (connected) this.reconcile();
    else this.deactivate(false);
  }

  private reconcile(): void {
    if (this.active) return;
    if (this.isEnabled() && this.isConnected()) this.activate();
  }

  private activate(): void {
    this.active = true;
    this.removeTabListeners = registerTabChangeListeners(() => this.debouncedPush());
    this.debouncedPush();
  }

  private deactivate(purge: boolean): void {
    const wasActive = this.active;
    this.active = false;
    this.debouncedPush.cancel();
    this.removeTabListeners?.();
    this.removeTabListeners = null;
    if (purge && wasActive) {
      getApiClient()
        .tabs.clearSnapshot.mutate()
        .catch((err) => console.error("Failed to clear tab snapshot", err));
    }
  }

  private async pushNow(): Promise<void> {
    if (!this.active) return;
    try {
      const [tabs, groupsById] = await Promise.all([browser.tabs.query({}), queryTabGroups()]);
      const snapshot = buildSnapshotTabs(tabs, groupsById);
      if (!this.active) return;
      await getApiClient().tabs.pushSnapshot.mutate({ tabs: snapshot });
    } catch (err) {
      console.error("Failed to push tab snapshot", err);
    }
  }
}

let controller: TabSyncController | null = null;

export async function startTabSync(): Promise<void> {
  if (controller) return;
  const storage = await getAnoriStorage();
  controller = new TabSyncController(storage);
  controller.start();
}
