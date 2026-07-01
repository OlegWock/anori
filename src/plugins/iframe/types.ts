import { z } from "zod";

export const iframePluginWidgetConfigSchema = z.object({
  title: z.string(),
  url: z.string(),
  showLinkToPage: z.boolean(),
});
export type IframePluginWidgetConfig = z.infer<typeof iframePluginWidgetConfigSchema>;

export const iframePluginExpandableWidgetConfigSchema = z.object({
  title: z.string(),
  icon: z.string(),
  url: z.string(),
  showLinkToPage: z.boolean(),
});
export type IframePluginExpandableWidgetConfig = z.infer<typeof iframePluginExpandableWidgetConfigSchema>;
