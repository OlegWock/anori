import { z } from "zod";

export const datetimeWidgetConfigSchema = z.object({
  tz: z.string(),
  title: z.string(),
  timeFormat: z.string(),
  dateFormat: z.string(),
});
export type DatetimeWidgetConfig = z.infer<typeof datetimeWidgetConfigSchema>;
