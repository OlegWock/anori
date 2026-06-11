import { usePluginConfig } from "@anori/utils/plugins/config";
import type { SomePlugin } from "@anori/utils/plugins/types";

export const PluginConfigurationSection = ({ plugin }: { plugin: SomePlugin }) => {
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
