import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type browser from "webextension-polyfill";
import {
  buildSnapshotTabs,
  type SnapshotTab,
  TAB_SYNC_DEBOUNCE_MS,
  TabSyncController,
  type TabSyncEnvironment,
} from "../tab-sync-controller";

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

const SNAPSHOT: SnapshotTab[] = [{ url: "https://a.com", title: "A" }];

function createTestEnv(initial: { enabled: boolean; connected: boolean }) {
  let enabled = initial.enabled;
  let connected = initial.connected;
  let enabledListener: ((enabled: boolean) => void) | null = null;
  let connectedListener: ((connected: boolean) => void) | null = null;
  let tabChangeHandler: (() => void) | null = null;
  let listenersAttached = false;

  const addTabChangeListeners = vi.fn((onChange: () => void) => {
    tabChangeHandler = onChange;
    listenersAttached = true;
    return () => {
      listenersAttached = false;
    };
  });

  const env: TabSyncEnvironment = {
    isEnabled: () => enabled,
    isConnected: () => connected,
    subscribeEnabled: (listener) => {
      enabledListener = listener;
      return () => {
        enabledListener = null;
      };
    },
    subscribeConnected: (listener) => {
      connectedListener = listener;
      return () => {
        connectedListener = null;
      };
    },
    addTabChangeListeners,
    buildSnapshot: vi.fn(async () => SNAPSHOT),
    pushSnapshot: vi.fn(async () => {}),
    clearSnapshot: vi.fn(async () => {}),
  };

  return {
    env,
    addTabChangeListeners,
    setEnabled(value: boolean) {
      enabled = value;
      enabledListener?.(value);
    },
    setConnected(value: boolean) {
      connected = value;
      connectedListener?.(value);
    },
    fireTabChange() {
      tabChangeHandler?.();
    },
    get listenersAttached() {
      return listenersAttached;
    },
  };
}

describe("TabSyncController", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("activates and pushes an initial snapshot when enabled and connected on start", async () => {
    const t = createTestEnv({ enabled: true, connected: true });
    const controller = new TabSyncController(t.env);

    controller.start();
    expect(t.listenersAttached).toBe(true);
    expect(t.env.pushSnapshot).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(TAB_SYNC_DEBOUNCE_MS);

    expect(t.env.buildSnapshot).toHaveBeenCalledTimes(1);
    expect(t.env.pushSnapshot).toHaveBeenCalledExactlyOnceWith(SNAPSHOT);
  });

  it("stays idle when enabled but not connected", async () => {
    const t = createTestEnv({ enabled: true, connected: false });
    const controller = new TabSyncController(t.env);

    controller.start();
    await vi.advanceTimersByTimeAsync(TAB_SYNC_DEBOUNCE_MS);

    expect(t.listenersAttached).toBe(false);
    expect(t.env.pushSnapshot).not.toHaveBeenCalled();
  });

  it("activates when the account connects later", async () => {
    const t = createTestEnv({ enabled: true, connected: false });
    const controller = new TabSyncController(t.env);
    controller.start();

    t.setConnected(true);
    expect(t.listenersAttached).toBe(true);

    await vi.advanceTimersByTimeAsync(TAB_SYNC_DEBOUNCE_MS);
    expect(t.env.pushSnapshot).toHaveBeenCalledTimes(1);
  });

  it("activates when the toggle is enabled later", async () => {
    const t = createTestEnv({ enabled: false, connected: true });
    const controller = new TabSyncController(t.env);
    controller.start();

    expect(t.listenersAttached).toBe(false);
    t.setEnabled(true);
    expect(t.listenersAttached).toBe(true);

    await vi.advanceTimersByTimeAsync(TAB_SYNC_DEBOUNCE_MS);
    expect(t.env.pushSnapshot).toHaveBeenCalledTimes(1);
  });

  it("debounces a burst of tab changes into a single push", async () => {
    const t = createTestEnv({ enabled: true, connected: true });
    const controller = new TabSyncController(t.env);
    controller.start();
    await vi.advanceTimersByTimeAsync(TAB_SYNC_DEBOUNCE_MS);
    vi.mocked(t.env.pushSnapshot).mockClear();

    t.fireTabChange();
    await vi.advanceTimersByTimeAsync(1000);
    t.fireTabChange();
    await vi.advanceTimersByTimeAsync(1000);
    t.fireTabChange();
    expect(t.env.pushSnapshot).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(TAB_SYNC_DEBOUNCE_MS);
    expect(t.env.pushSnapshot).toHaveBeenCalledTimes(1);
  });

  it("purges the server snapshot and detaches listeners when disabled", async () => {
    const t = createTestEnv({ enabled: true, connected: true });
    const controller = new TabSyncController(t.env);
    controller.start();
    await vi.advanceTimersByTimeAsync(TAB_SYNC_DEBOUNCE_MS);
    vi.mocked(t.env.pushSnapshot).mockClear();

    t.setEnabled(false);
    expect(t.env.clearSnapshot).toHaveBeenCalledTimes(1);
    expect(t.listenersAttached).toBe(false);

    t.fireTabChange();
    await vi.advanceTimersByTimeAsync(TAB_SYNC_DEBOUNCE_MS);
    expect(t.env.pushSnapshot).not.toHaveBeenCalled();
  });

  it("stops syncing without purging when the account disconnects", async () => {
    const t = createTestEnv({ enabled: true, connected: true });
    const controller = new TabSyncController(t.env);
    controller.start();
    await vi.advanceTimersByTimeAsync(TAB_SYNC_DEBOUNCE_MS);
    vi.mocked(t.env.pushSnapshot).mockClear();

    t.setConnected(false);
    expect(t.listenersAttached).toBe(false);
    expect(t.env.clearSnapshot).not.toHaveBeenCalled();

    t.fireTabChange();
    await vi.advanceTimersByTimeAsync(TAB_SYNC_DEBOUNCE_MS);
    expect(t.env.pushSnapshot).not.toHaveBeenCalled();
  });

  it("never clears the snapshot when disabled while already disconnected", async () => {
    const t = createTestEnv({ enabled: true, connected: true });
    const controller = new TabSyncController(t.env);
    controller.start();
    await vi.advanceTimersByTimeAsync(TAB_SYNC_DEBOUNCE_MS);

    t.setConnected(false);
    vi.mocked(t.env.clearSnapshot).mockClear();

    t.setEnabled(false);
    expect(t.env.clearSnapshot).not.toHaveBeenCalled();
  });

  it("re-activates after being disabled and re-enabled", async () => {
    const t = createTestEnv({ enabled: true, connected: true });
    const controller = new TabSyncController(t.env);
    controller.start();
    await vi.advanceTimersByTimeAsync(TAB_SYNC_DEBOUNCE_MS);

    t.setEnabled(false);
    vi.mocked(t.env.pushSnapshot).mockClear();

    t.setEnabled(true);
    expect(t.listenersAttached).toBe(true);
    await vi.advanceTimersByTimeAsync(TAB_SYNC_DEBOUNCE_MS);
    expect(t.env.pushSnapshot).toHaveBeenCalledTimes(1);
  });

  it("stop() detaches listeners and cancels pending work without purging", async () => {
    const t = createTestEnv({ enabled: true, connected: true });
    const controller = new TabSyncController(t.env);
    controller.start();

    controller.stop();
    expect(t.listenersAttached).toBe(false);
    expect(t.env.clearSnapshot).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(TAB_SYNC_DEBOUNCE_MS);
    expect(t.env.pushSnapshot).not.toHaveBeenCalled();
  });
});
