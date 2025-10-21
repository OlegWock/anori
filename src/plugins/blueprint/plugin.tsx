import { Button } from "@anori/components/Button";
import "./styles.scss";
import { translate } from "@anori/translations/index";
import { definePlugin, defineWidget } from "@anori/utils/plugins/define";
import type { WidgetConfigurationScreenProps, WidgetRenderProps } from "@anori/utils/plugins/types";
import { useTranslation } from "react-i18next";

type PluginWidgetConfigType = {
  exampleConfigProp: string;
};

const WidgetConfigScreen = ({
  saveConfiguration,
  currentConfig,
}: WidgetConfigurationScreenProps<PluginWidgetConfigType>) => {
  const onConfirm = () => {
    saveConfiguration({
      exampleConfigProp: "test",
    });
  };

  const { t } = useTranslation();

  return (
    <div className="PluginWidget-config">
      <div>{t("blueprint-plugin.name")}</div>
      Prop value: {currentConfig?.exampleConfigProp}
      <Button className="save-config" onClick={onConfirm}>
        Save
      </Button>
    </div>
  );
};

const MainScreen = ({ config, instanceId }: WidgetRenderProps<PluginWidgetConfigType>) => {
  const { t } = useTranslation();
  return (
    <div className="PluginWidget">
      {t("blueprint-plugin.name")}
      Prop value: {config.exampleConfigProp} (instance id {instanceId})
    </div>
  );
};

const widgetDescriptor = defineWidget({
  id: "widget",
  get name() {
    return translate("blueprint-plugin.widgetName");
  },
  configurationScreen: WidgetConfigScreen,
  mainScreen: MainScreen,
  mock: () => {
    return <MainScreen instanceId="mock" config={{ exampleConfigProp: "hey!" }} />;
  },
  appearance: {
    size: {
      width: 1,
      height: 1,
    },
    resizable: false,
  },
});

export const pluginnamePlugin = definePlugin({
  id: "pluginname-plugin",
  get name() {
    return translate("blueprint-plugin.name");
  },
  configurationScreen: null,
}).withWidgets(widgetDescriptor);
