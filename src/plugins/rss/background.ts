import { wait } from "@anori/utils/misc";
import type { RssContext } from "./rss-plugin";
import { getRssStore, updateFeedsForWidget } from "./utils";

export const rssScheduledCallback = async (ctx: RssContext) => {
  console.log("Updating feeds in background");
  const widgets = await ctx.getWidgets();
  const promises = widgets.map(async (w) => {
    const store = getRssStore(w.instanceId);
    await store.waitForLoad();
    if ("feedUrl" in w.config) {
      return updateFeedsForWidget([w.config.feedUrl], store);
    }
    return updateFeedsForWidget(w.config.feedUrls, store);
  });
  await Promise.all(promises);
  await wait(1000); // Make sure widget storage synced to the disk
  console.log("Updated all RSS feeds in background");
};
