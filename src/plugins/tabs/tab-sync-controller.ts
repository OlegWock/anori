import type { DebouncedFunc } from "lodash";
import debounce from "lodash/debounce";
import type browser from "webextension-polyfill";
import { isCapturableUrl } from "./urls";

export type SnapshotTab = {
  url: string;
  title: string;
  windowId?: number;
  groupId?: number;
  groupName?: string;
  groupColor?: string;
  pinned?: boolean;
  lastActiveAt?: number;
};

const TAB_GROUP_ID_NONE = -1;

export function buildSnapshotTabs(
  tabs: browser.Tabs.Tab[],
  groupsById: Map<number, browser.TabGroups.TabGroup>,
): SnapshotTab[] {
  const result: SnapshotTab[] = [];
  for (const tab of tabs) {
    if (tab.incognito || !isCapturableUrl(tab.url)) continue;

    const snapshot: SnapshotTab = {
      url: tab.url,
      title: tab.title ?? tab.url,
    };
    if (tab.windowId !== undefined) snapshot.windowId = tab.windowId;
    if (tab.pinned) snapshot.pinned = true;
    if (tab.lastAccessed !== undefined) snapshot.lastActiveAt = tab.lastAccessed;

    const groupId = tab.groupId ?? TAB_GROUP_ID_NONE;
    if (groupId !== TAB_GROUP_ID_NONE) {
      snapshot.groupId = groupId;
      const group = groupsById.get(groupId);
      if (group?.title) snapshot.groupName = group.title;
      if (group?.color) snapshot.groupColor = group.color;
    }

    result.push(snapshot);
  }
  return result;
}

export interface TabSyncEnvironment {
  isEnabled(): boolean;
  isConnected(): boolean;
  subscribeEnabled(listener: (enabled: boolean) => void): () => void;
  subscribeConnected(listener: (connected: boolean) => void): () => void;
  addTabChangeListeners(onChange: () => void): () => void;
  buildSnapshot(): Promise<SnapshotTab[]>;
  pushSnapshot(tabs: SnapshotTab[]): Promise<void>;
  clearSnapshot(): Promise<void>;
}

export const TAB_SYNC_DEBOUNCE_MS = 5000;
export const TAB_SYNC_MAX_WAIT_MS = 30000;

export class TabSyncController {
  private started = false;
  private active = false;
  private removeTabListeners: (() => void) | null = null;
  private subscriptions: Array<() => void> = [];
  private readonly debouncedPush: DebouncedFunc<() => void>;

  constructor(private readonly env: TabSyncEnvironment) {
    this.debouncedPush = debounce(() => this.pushNow(), TAB_SYNC_DEBOUNCE_MS, { maxWait: TAB_SYNC_MAX_WAIT_MS });
  }

  start(): void {
    if (this.started) return;
    this.started = true;
    this.subscriptions.push(
      this.env.subscribeEnabled((enabled) => this.handleEnabledChange(enabled)),
      this.env.subscribeConnected((connected) => this.handleConnectedChange(connected)),
    );
    this.reconcile();
  }

  stop(): void {
    this.started = false;
    for (const unsubscribe of this.subscriptions) unsubscribe();
    this.subscriptions = [];
    this.debouncedPush.cancel();
    this.detachTabListeners();
    this.active = false;
  }

  private handleEnabledChange(enabled: boolean): void {
    if (enabled) {
      this.reconcile();
    } else {
      this.deactivate({ purge: true });
    }
  }

  private handleConnectedChange(connected: boolean): void {
    if (connected) {
      this.reconcile();
    } else {
      this.deactivate({ purge: false });
    }
  }

  private reconcile(): void {
    if (this.active) return;
    if (this.env.isEnabled() && this.env.isConnected()) this.activate();
  }

  private activate(): void {
    this.active = true;
    this.removeTabListeners = this.env.addTabChangeListeners(() => this.debouncedPush());
    this.debouncedPush();
  }

  private deactivate({ purge }: { purge: boolean }): void {
    const wasActive = this.active;
    this.active = false;
    this.debouncedPush.cancel();
    this.detachTabListeners();
    if (purge && wasActive) {
      this.env.clearSnapshot().catch((err) => console.error("Failed to clear tab snapshot", err));
    }
  }

  private detachTabListeners(): void {
    if (this.removeTabListeners) {
      this.removeTabListeners();
      this.removeTabListeners = null;
    }
  }

  private async pushNow(): Promise<void> {
    if (!this.active) return;
    try {
      const tabs = await this.env.buildSnapshot();
      if (!this.active) return;
      await this.env.pushSnapshot(tabs);
    } catch (err) {
      console.error("Failed to push tab snapshot", err);
    }
  }
}
