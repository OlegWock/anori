import { z } from "zod";

export const picturePluginWidgetConfigSchema = z.object({
  // "url" renders `url`; "local" renders the OPFS file identified by `imageId`. Defaults to "url" for
  // configs that predate this field, so the widget never has to treat absence as "url".
  source: z.enum(["url", "local"]).default("url"),
  url: z.string(),
  imageId: z.string().optional(),
});
export type PicturePluginWidgetConfig = z.infer<typeof picturePluginWidgetConfigSchema>;
