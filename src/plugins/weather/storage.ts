import { createScopedStoreFactories } from "@anori/utils/scoped-store";
import { anoriSchema } from "@anori/utils/storage";

export const { useStore: useCurrentWeatherStore } = createScopedStoreFactories(
  anoriSchema.weatherCurrentWidgetStore.store,
);

export const { useStore: useForecastWeatherStore } = createScopedStoreFactories(
  anoriSchema.weatherForecastWidgetStore.store,
);
