// Context type is recovered from the plugin's identity (type-only import, so no runtime plugin<->background cycle).
import type { BlueprintContext } from "./blueprint-plugin";

/**
 * Scheduled callback that runs every N minutes in the background worker.
 */
export const updateAllWidgets = async (ctx: BlueprintContext) => {
  const apiKey = (await ctx.getConfig())?.apiKey; // plugin-level config, typed
  const widgets = await ctx.getWidgets(); // each widget is typed and correlated with its descriptor
  console.log(`Blueprint: refreshing ${widgets.length} widget(s) in background`, apiKey ? "(with API key)" : "");

  for (const widget of widgets) {
    // widget.config is BlueprintWidgetConfig (typed); widget.widgetId is "widget".
    void widget.config.title;
    // Example: refresh cached data for each instance
    // const store = getBlueprintStore(widget.instanceId);
    // await store.set("lastRefreshed", Date.now());
  }
};
