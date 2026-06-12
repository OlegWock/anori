import { z } from "zod";

export const ankiPluginWidgetConfigSchema = z.object({
  deckName: z.string(),
});
export type AnkiPluginWidgetConfigType = z.infer<typeof ankiPluginWidgetConfigSchema>;

export type AnkiCardInfo = {
  question: string;
  answer: string;
  cardId: number;
  deckName: string;
  fields: Record<string, { value: string; order: number }>;
  modelName: string;
  note: number;
};
