import { z } from "zod";

export const taskWidgetConfigSchema = z.object({
  title: z.string(),
});
export type TaskWidgetConfig = z.infer<typeof taskWidgetConfigSchema>;
