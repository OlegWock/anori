import { createScopedStoreFactories } from "@anori/utils/scoped-store";
import { anoriSchema, type FocusWidgetStore } from "@anori/utils/storage";

export const { useStore: useFocusStore } = createScopedStoreFactories<FocusWidgetStore>(
  anoriSchema.focusWidgetStore.store,
);
