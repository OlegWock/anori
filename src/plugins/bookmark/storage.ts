import { createScopedStoreFactories } from "@anori/utils/scoped-store";
import { anoriSchema } from "@anori/utils/storage";

export const { getStore: getBookmarkStore, useStore: useBookmarkStore } = createScopedStoreFactories(
  anoriSchema.bookmarkWidgetStore.store,
);
