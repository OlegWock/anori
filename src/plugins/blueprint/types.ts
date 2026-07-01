import { z } from "zod";

/**
 * Per-widget config. Persisted per widget instance; the widget receives the parsed value as `config`.
 */
export const blueprintWidgetConfigSchema = z.object({
  title: z.string(),
  showIcon: z.boolean(),
});
export type BlueprintWidgetConfig = z.infer<typeof blueprintWidgetConfigSchema>;

/**
 * Plugin-level config — shared by every widget of this plugin (e.g. an API key / login the user enters
 * once instead of per widget). Widgets receive it as `pluginConfig`; background tasks read it via `ctx.getConfig()`.
 */
export const blueprintPluginConfigSchema = z.object({
  apiKey: z.string(),
});
export type BlueprintPluginConfig = z.infer<typeof blueprintPluginConfigSchema>;

/**
 * Typed message handlers for background communication. Keys are message names; values define args/result.
 */
export type BlueprintMessageHandlers = {
  fetchData: {
    args: { query: string };
    result: { items: string[] };
  };
};

/**
 * Shape of widget-scoped storage.
 */
export type BlueprintWidgetStore = {
  lastRefreshed: number | null;
};
