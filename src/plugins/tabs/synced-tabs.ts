import type { SnapshotTab } from "./tab-sync-controller";

export type SyncedTab = SnapshotTab;

export type SyncedDevice = {
  deviceId: string;
  name: string;
  browser: string | null;
  os: string | null;
  updatedAt: string;
  tabs: SyncedTab[];
};

export type DeviceTabItem =
  | { type: "tab"; tab: SyncedTab }
  | { type: "group"; groupId: number; name?: string; color?: string; tabs: SyncedTab[] };

export function sortDevices(devices: SyncedDevice[]): SyncedDevice[] {
  return [...devices].sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
}

export function sortTabsByRecency(tabs: SyncedTab[]): SyncedTab[] {
  return [...tabs].sort((a, b) => (b.lastActiveAt ?? 0) - (a.lastActiveAt ?? 0));
}

export function clusterDeviceTabs(tabs: SyncedTab[]): DeviceTabItem[] {
  const items: DeviceTabItem[] = [];
  const groupsById = new Map<number, Extract<DeviceTabItem, { type: "group" }>>();

  for (const tab of sortTabsByRecency(tabs)) {
    if (tab.groupId === undefined) {
      items.push({ type: "tab", tab });
      continue;
    }

    let group = groupsById.get(tab.groupId);
    if (!group) {
      group = { type: "group", groupId: tab.groupId, name: tab.groupName, color: tab.groupColor, tabs: [] };
      groupsById.set(tab.groupId, group);
      items.push(group);
    }
    group.tabs.push(tab);
  }

  return items;
}

const ROWS_PER_BOX = 4;
const MIN_TABS_PER_DEVICE = 3;
const WIDGET_HEADER_ROWS = 1;
// Each device costs a title row plus (when collapsed) a "Show all" row on top of its shown tabs.
const DEVICE_OVERHEAD_ROWS = 2;

// How many tabs to show per device before collapsing the rest, chosen to roughly fill the widget's
// height across the devices. A box of widget height fits about ROWS_PER_BOX list rows. Never below
// MIN_TABS_PER_DEVICE, so a taller widget shows more tabs and a resize re-fills the space.
export function computeCollapseAfter(heightBoxes: number, deviceCount: number): number {
  if (deviceCount <= 0) return MIN_TABS_PER_DEVICE;
  const availableRows = heightBoxes * ROWS_PER_BOX - WIDGET_HEADER_ROWS;
  return Math.max(MIN_TABS_PER_DEVICE, Math.floor(availableRows / deviceCount) - DEVICE_OVERHEAD_ROWS);
}

export type SyncedTabsView = "not-connected" | "empty" | "devices";

export function resolveSyncedTabsView(params: { isConnected: boolean; deviceCount: number }): SyncedTabsView {
  if (!params.isConnected) return "not-connected";
  if (params.deviceCount === 0) return "empty";
  return "devices";
}
