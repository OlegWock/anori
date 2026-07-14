import { describe, expect, it } from "vitest";
import {
  clusterDeviceTabs,
  computeCollapseAfter,
  resolveSyncedTabsView,
  type SyncedDevice,
  type SyncedTab,
  sortDevices,
  sortTabsByRecency,
} from "../synced-tabs";

const tab = (partial: Partial<SyncedTab> & { url: string }): SyncedTab => ({ title: partial.url, ...partial });
const device = (partial: Partial<SyncedDevice> & { deviceId: string }): SyncedDevice => ({
  name: partial.deviceId,
  browser: null,
  os: null,
  updatedAt: "1970-01-01T00:00:00.000Z",
  tabs: [],
  ...partial,
});

describe("sortDevices", () => {
  it("orders devices by updatedAt, most recent first", () => {
    const devices = [
      device({ deviceId: "old", updatedAt: "2026-01-01T00:00:00.000Z" }),
      device({ deviceId: "new", updatedAt: "2026-06-01T00:00:00.000Z" }),
      device({ deviceId: "mid", updatedAt: "2026-03-01T00:00:00.000Z" }),
    ];

    expect(sortDevices(devices).map((d) => d.deviceId)).toEqual(["new", "mid", "old"]);
  });

  it("does not mutate the input", () => {
    const devices = [
      device({ deviceId: "a", updatedAt: "2026-01-01T00:00:00.000Z" }),
      device({ deviceId: "b", updatedAt: "2026-06-01T00:00:00.000Z" }),
    ];
    sortDevices(devices);
    expect(devices.map((d) => d.deviceId)).toEqual(["a", "b"]);
  });
});

describe("sortTabsByRecency", () => {
  it("orders by lastActiveAt desc, treating missing as oldest", () => {
    const tabs = [
      tab({ url: "https://a.com", lastActiveAt: 100 }),
      tab({ url: "https://b.com" }),
      tab({ url: "https://c.com", lastActiveAt: 300 }),
    ];

    expect(sortTabsByRecency(tabs).map((t) => t.url)).toEqual(["https://c.com", "https://a.com", "https://b.com"]);
  });
});

describe("clusterDeviceTabs", () => {
  it("clusters grouped tabs under a single item at the position of the group's most recent tab", () => {
    const tabs = [
      tab({ url: "https://ungrouped-new.com", lastActiveAt: 500 }),
      tab({ url: "https://grp-a1.com", groupId: 1, groupName: "Work", groupColor: "blue", lastActiveAt: 400 }),
      tab({ url: "https://ungrouped-mid.com", lastActiveAt: 300 }),
      tab({ url: "https://grp-a2.com", groupId: 1, groupName: "Work", groupColor: "blue", lastActiveAt: 200 }),
    ];

    const items = clusterDeviceTabs(tabs);

    expect(items).toHaveLength(3);
    expect(items[0]).toMatchObject({ type: "tab", tab: { url: "https://ungrouped-new.com" } });
    expect(items[1]).toMatchObject({ type: "group", groupId: 1, name: "Work", color: "blue" });
    expect(items[1].type === "group" && items[1].tabs.map((t) => t.url)).toEqual([
      "https://grp-a1.com",
      "https://grp-a2.com",
    ]);
    expect(items[2]).toMatchObject({ type: "tab", tab: { url: "https://ungrouped-mid.com" } });
  });

  it("keeps separate groups separate", () => {
    const tabs = [
      tab({ url: "https://g1.com", groupId: 1, lastActiveAt: 200 }),
      tab({ url: "https://g2.com", groupId: 2, lastActiveAt: 100 }),
    ];

    const items = clusterDeviceTabs(tabs);
    expect(items.map((i) => i.type)).toEqual(["group", "group"]);
  });
});

describe("resolveSyncedTabsView", () => {
  it("returns not-connected when disconnected regardless of device count", () => {
    expect(resolveSyncedTabsView({ isConnected: false, deviceCount: 5 })).toBe("not-connected");
  });

  it("returns empty when connected but no devices are sharing", () => {
    expect(resolveSyncedTabsView({ isConnected: true, deviceCount: 0 })).toBe("empty");
  });

  it("returns devices when connected with at least one device", () => {
    expect(resolveSyncedTabsView({ isConnected: true, deviceCount: 2 })).toBe("devices");
  });
});

describe("computeCollapseAfter", () => {
  it("never goes below the 3-tab minimum on a short widget", () => {
    expect(computeCollapseAfter(2, 2)).toBe(3);
    expect(computeCollapseAfter(2, 3)).toBe(3);
  });

  it("shows more tabs per device as the widget grows taller", () => {
    expect(computeCollapseAfter(4, 2)).toBeGreaterThan(computeCollapseAfter(2, 2));
    expect(computeCollapseAfter(6, 2)).toBeGreaterThan(computeCollapseAfter(4, 2));
  });

  it("shows fewer tabs per device as more devices share the height", () => {
    expect(computeCollapseAfter(6, 2)).toBeGreaterThan(computeCollapseAfter(6, 4));
  });

  it("falls back to the minimum for a nonsensical device count", () => {
    expect(computeCollapseAfter(4, 0)).toBe(3);
  });
});
