import { createScopedStoreFactories } from "@anori/utils/scoped-store";
import { anoriSchema } from "@anori/utils/storage";

export const { useStore: useTopSitesStore } = createScopedStoreFactories(anoriSchema.topSitesWidgetStore.store);
