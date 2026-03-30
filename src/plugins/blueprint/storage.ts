import { createScopedStoreFactories } from "@anori/utils/scoped-store";
import type { BlueprintWidgetStore } from "./types";

// Example: if your plugin has a dedicated store in the schema, use it like this:
//   const { getStore, useStore } = createScopedStoreFactories(anoriSchema.blueprintWidgetStore.store);
//
// For the blueprint, we show the pattern with a manual type annotation.
// In a real plugin, replace this with your actual schema reference.

export const { getStore: getBlueprintStore, useStore: useBlueprintStore } =
  createScopedStoreFactories<BlueprintWidgetStore>(
    // Replace with your actual schema store reference, e.g.:
    // anoriSchema.blueprintWidgetStore.store
    {} as never, // placeholder — real plugins use a schema reference here
  );
