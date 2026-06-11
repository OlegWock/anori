import { wait } from "@anori/utils/misc";
import { erasePlugin } from "@anori/utils/plugins/erase";
import type { AnoriPlugin } from "@anori/utils/plugins/types";
import { getAllWidgetsByPlugin } from "@anori/utils/plugins/widget";
import type { RssFeedConfig, RssLatestPostConfig } from "./types";
import { getRssStore, updateFeedsForWidget } from "./utils";

export const rssScheduledCallback = async (plugin: AnoriPlugin) => {
  console.log("Updating feeds in background");
  const widgets = await getAllWidgetsByPlugin(erasePlugin(plugin));
  const promises = widgets.map(async (w) => {
    const config = w.configuration as RssFeedConfig | RssLatestPostConfig;
    const store = getRssStore(w.instanceId);
    await store.waitForLoad();
    if ("feedUrl" in config) {
      return updateFeedsForWidget([config.feedUrl], store);
    }
    return updateFeedsForWidget(config.feedUrls, store);
  });
  await Promise.all(promises);
  await wait(1000); // Make sure widget storage synced to the disk
  console.log("Updated all RSS feeds in background");
};
