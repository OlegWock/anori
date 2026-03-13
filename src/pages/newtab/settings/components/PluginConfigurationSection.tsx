import { usePluginConfig } from "@anori/utils/plugins/config";
import type { AnoriPlugin } from "@anori/utils/plugins/types";
import type { Mapping } from "@anori/utils/types";

export const PluginConfigurationSection = <T extends Mapping>({ plugin }: { plugin: AnoriPlugin<string, T> }) => {
  const [config, setConfig] = usePluginConfig(plugin);
  if (plugin.configurationScreen) {
    const ConfigScreen = plugin.configurationScreen;
    return (
      <section>
        <h2>{plugin.name}</h2>
        <ConfigScreen currentConfig={config} saveConfiguration={setConfig} />
      </section>
    );
  }

  return null;
};
