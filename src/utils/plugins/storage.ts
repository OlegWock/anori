import { NamespacedStorage } from "@anori/utils/namespaced-storage";
import { anoriSchema } from "@anori/utils/storage";
import type { ID, Mapping } from "@anori/utils/types";
import { useMemo } from "react";
import { useWidgetMetadata } from "./widget";

export const getWidgetStorage = <StorageT extends Mapping>(instanceId: ID) => {
  return NamespacedStorage.get<StorageT>(anoriSchema.latestSchema.definition.widgetStorage.byId(instanceId));
};

export const useWidgetStorage = <StorageT extends Mapping>() => {
  const metadata = useWidgetMetadata();
  const nsStorage = useMemo(() => getWidgetStorage<StorageT>(metadata.instanceId), [metadata.instanceId]);
  return nsStorage;
};

export const getPluginStorage = <StorageT extends Mapping>(pluginId: ID) => {
  return NamespacedStorage.get<StorageT>(anoriSchema.latestSchema.definition.pluginStorage.byId(pluginId));
};

export const usePluginStorage = <StorageT extends Mapping>() => {
  const metadata = useWidgetMetadata();
  const nsStorage = useMemo(() => getPluginStorage<StorageT>(metadata.pluginId), [metadata.pluginId]);
  return nsStorage;
};
