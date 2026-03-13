export type AnkiPluginWidgetConfigType = {
  deckName: string;
};

export type AnkiCardInfo = {
  question: string;
  answer: string;
  cardId: number;
  deckName: string;
  fields: Record<string, { value: string; order: number }>;
  modelName: string;
  note: number;
};
