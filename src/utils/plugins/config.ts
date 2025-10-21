import type { AnoriPlugin } from "@anori/utils/plugins/types";
import {
  type AtomWithBrowserStorage,
  atomWithBrowserStorage,
  storage,
  useAtomWithStorage,
} from "@anori/utils/storage/api";
import type { ID, Mapping } from "@anori/utils/types";
import type { SetStateAction } from "react";

const pluginConfigAtoms: Record<ID, AtomWithBrowserStorage<unknown>> = {};
const getPluginConfigAtom = <T extends Mapping>(plugin: AnoriPlugin<string, T>) => {
  if (!pluginConfigAtoms[plugin.id]) {
    pluginConfigAtoms[plugin.id] = atomWithBrowserStorage<T | undefined>(`PluginConfig.${plugin.id}`, undefined);
  }

  return pluginConfigAtoms[plugin.id] as AtomWithBrowserStorage<T | undefined>;
};

export function usePluginConfig<T extends Mapping>(
  plugin: AnoriPlugin<string, T>,
): readonly [value: T | undefined, setValue: (val: SetStateAction<T>) => void, isLoaded: boolean];
export function usePluginConfig<T extends Mapping>(
  plugin: AnoriPlugin<string, T>,
  defaultConfig: T,
): readonly [value: T, setValue: (val: SetStateAction<T>) => void, isLoaded: boolean];
export function usePluginConfig<T extends Mapping>(
  plugin: AnoriPlugin<string, T>,
  defaultConfig?: T,
): readonly [value: T | undefined, setValue: (val: SetStateAction<T>) => void, isLoaded: boolean] {
  const [val, setVal, meta] = useAtomWithStorage(getPluginConfigAtom<T>(plugin));

  return [meta.usingDefaultValue ? defaultConfig : val, setVal, ["loaded", "empty"].includes(meta.status)] as const;
}

export const getPluginConfig = <T extends Mapping>(plugin: AnoriPlugin<string, T>) => {
  return storage.getOneDynamic<T>(`PluginConfig.${plugin.id}`);
};
