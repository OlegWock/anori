import { normalizeUrl } from "@anori/utils/misc";
import type { AnoriPlugin } from "@anori/utils/plugins/types";
import { getAllWidgetsByPlugin } from "@anori/utils/plugins/widget";
import type { BookmarkWidgetStore } from "@anori/utils/storage";
import type { ID } from "@anori/utils/types";
import { getBookmarkStore } from "./storage";
import type { BookmarkWidgetConfig } from "./types";

const getPageStatus = async (url: string): Promise<"up" | "down"> => {
  try {
    const resp = await fetch(url);
    if (resp.status >= 500) return "down";
    return "up";
  } catch (err) {
    console.log("Error while checking page status", url, err);
    return "down";
  }
};

export const updateStatusesForTrackedPages = async <P extends AnoriPlugin>(plugin: P) => {
  const widgets = await getAllWidgetsByPlugin(plugin);
  const widgetsToCheck = widgets
    .filter((w) => w.widgetId === "bookmark")
    .filter((w) => (w.configuration as BookmarkWidgetConfig).checkStatus);

  const promises = widgetsToCheck.map(async (w) => {
    const config = w.configuration as BookmarkWidgetConfig;
    const store = getBookmarkStore(w.instanceId);
    await store.waitForLoad();
    const currentStatus = store.get("status");
    store.set("status", "loading");
    const newStatus = await getPageStatus(normalizeUrl(config.url));
    const updatePayload: Partial<BookmarkWidgetStore> = {
      lastCheck: Date.now(),
      status: newStatus,
    };
    if (currentStatus !== newStatus) {
      updatePayload.lastStatusChange = Date.now();
    }

    await store.setMany(updatePayload);
  });

  await Promise.all(promises);
};

export const updatePageStatusForWidget = async (instaceId: ID, url: string) => {
  const store = getBookmarkStore(instaceId);
  await store.waitForLoad();
  const currentStatus = store.get("status");
  store.set("status", "loading");
  const newStatus = await getPageStatus(normalizeUrl(url));
  const updatePayload: Partial<BookmarkWidgetStore> = {
    lastCheck: Date.now(),
    status: newStatus,
  };
  if (currentStatus !== newStatus) {
    updatePayload.lastStatusChange = Date.now();
  }

  await store.setMany(updatePayload);
};

export const STATUS_CHECK_INTERVAL_MINUTES = 10;
