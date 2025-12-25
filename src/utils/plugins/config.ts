import type { AnoriPlugin } from "@anori/utils/plugins/types";
import { anoriSchema, getAnoriStorage, useWritableStorageValue } from "@anori/utils/storage";
import type { Mapping } from "@anori/utils/types";
import type { SetStateAction } from "react";

export function usePluginConfig<T extends Mapping>(
  plugin: AnoriPlugin<string, T>,
): readonly [value: T | undefined, setValue: (val: SetStateAction<T | undefined>) => Promise<void>];
export function usePluginConfig<T extends Mapping>(
  plugin: AnoriPlugin<string, T>,
  defaultConfig: T,
): readonly [value: T, setValue: (val: SetStateAction<T | undefined>) => Promise<void>];
export function usePluginConfig<T extends Mapping>(
  plugin: AnoriPlugin<string, T>,
  defaultConfig?: T,
): readonly [value: T | undefined, setValue: (val: SetStateAction<T | undefined>) => Promise<void>] {
  const query = anoriSchema.latestSchema.definition.pluginConfig.config.byId(plugin.id);
  const [val, setVal, meta] = useWritableStorageValue(query);

  const finalValue = meta.isDefault ? defaultConfig : (val as T | undefined);

  return [finalValue, setVal as (val: SetStateAction<T | undefined>) => Promise<void>] as const;
}

export const getPluginConfig = async <T extends Mapping>(plugin: AnoriPlugin<string, T>): Promise<T | undefined> => {
  const storage = await getAnoriStorage();
  return storage.get(anoriSchema.latestSchema.definition.pluginConfig.config.byId(plugin.id)) as T | undefined;
};
