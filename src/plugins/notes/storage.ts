import { createScopedStoreFactories } from "@anori/utils/scoped-store";
import { type NotesWidgetStore, anoriSchema } from "@anori/utils/storage";

export const { useStore: useNotesStore } = createScopedStoreFactories<NotesWidgetStore>(
  anoriSchema.notesWidgetStore.store,
);
