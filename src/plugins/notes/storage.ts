import { createScopedStoreFactories } from "@anori/utils/scoped-store";
import { anoriSchema, type NotesWidgetStore } from "@anori/utils/storage";

export const { useStore: useNotesStore } = createScopedStoreFactories<NotesWidgetStore>(
  anoriSchema.notesWidgetStore.store,
);
