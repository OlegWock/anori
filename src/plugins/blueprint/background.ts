import type { AnoriPlugin } from "@anori/utils/plugins/types";
import { getAllWidgetsByPlugin } from "@anori/utils/plugins/widget";

/**
 * Scheduled callback that runs every N minutes in the background worker.
 */
export const updateAllWidgets = async <P extends AnoriPlugin>(plugin: P) => {
  const widgets = await getAllWidgetsByPlugin(plugin);
  console.log(`Blueprint: refreshing ${widgets.length} widget(s) in background`);

  for (const _widget of widgets) {
    // Example: refresh cached data for each widget instance
    // const store = getBlueprintStore(widget.instanceId);
    // await store.set("lastRefreshed", Date.now());
  }
};
