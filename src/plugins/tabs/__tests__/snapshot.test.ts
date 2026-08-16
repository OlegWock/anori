import { describe, expect, it } from "vitest";
import type browser from "webextension-polyfill";
import { buildSnapshotTabs } from "../snapshot";

const makeTab = (tab: Partial<browser.Tabs.Tab>): browser.Tabs.Tab => tab as browser.Tabs.Tab;
const makeGroup = (group: Partial<browser.TabGroups.TabGroup>): browser.TabGroups.TabGroup =>
  group as browser.TabGroups.TabGroup;

describe("buildSnapshotTabs", () => {
  it("keeps only http(s) non-incognito tabs", () => {
    const tabs = [
      makeTab({ url: "https://example.com", title: "Example" }),
      makeTab({ url: "http://plain.com", title: "Plain" }),
      makeTab({ url: "chrome://settings", title: "Settings" }),
      makeTab({ url: "about:blank", title: "Blank" }),
      makeTab({ url: undefined, title: "No url" }),
      makeTab({ url: "https://secret.com", title: "Secret", incognito: true }),
    ];

    const result = buildSnapshotTabs(tabs, new Map());

    expect(result.map((t) => t.url)).toEqual(["https://example.com", "http://plain.com"]);
  });

  it("maps optional fields and falls back to url when title is missing", () => {
    const tabs = [
      makeTab({
        url: "https://a.com",
        title: undefined,
        windowId: 7,
        pinned: true,
        lastAccessed: 1234,
      }),
    ];

    const result = buildSnapshotTabs(tabs, new Map());

    expect(result[0]).toEqual({
      url: "https://a.com",
      title: "https://a.com",
      windowId: 7,
      pinned: true,
      lastActiveAt: 1234,
    });
  });

  it("omits pinned when falsy and lastActiveAt when unset", () => {
    const result = buildSnapshotTabs([makeTab({ url: "https://a.com", title: "A", pinned: false })], new Map());

    expect(result[0]).not.toHaveProperty("pinned");
    expect(result[0]).not.toHaveProperty("lastActiveAt");
  });

  it("resolves group name and color for grouped tabs", () => {
    const groups = new Map<number, browser.TabGroups.TabGroup>([
      [42, makeGroup({ id: 42, title: "Research", color: "blue" })],
    ]);
    const tabs = [makeTab({ url: "https://a.com", title: "A", groupId: 42 })];

    const result = buildSnapshotTabs(tabs, groups);

    expect(result[0]).toMatchObject({ groupId: 42, groupName: "Research", groupColor: "blue" });
  });

  it("does not set group fields for ungrouped tabs (groupId === -1)", () => {
    const result = buildSnapshotTabs([makeTab({ url: "https://a.com", title: "A", groupId: -1 })], new Map());

    expect(result[0]).not.toHaveProperty("groupId");
    expect(result[0]).not.toHaveProperty("groupName");
  });

  it("sets groupId but no name/color when the group is unknown or unnamed", () => {
    const groups = new Map<number, browser.TabGroups.TabGroup>([[9, makeGroup({ id: 9, title: "", color: "grey" })]]);
    const tabs = [
      makeTab({ url: "https://a.com", title: "A", groupId: 9 }),
      makeTab({ url: "https://b.com", title: "B", groupId: 5 }),
    ];

    const result = buildSnapshotTabs(tabs, groups);

    expect(result[0]).toMatchObject({ groupId: 9, groupColor: "grey" });
    expect(result[0]).not.toHaveProperty("groupName");
    expect(result[1]).toMatchObject({ groupId: 5 });
    expect(result[1]).not.toHaveProperty("groupName");
    expect(result[1]).not.toHaveProperty("groupColor");
  });
});
