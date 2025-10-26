import { Button } from "@anori/components/Button";
import "./styles.scss";
import { Input } from "@anori/components/Input";
import { builtinIcons } from "@anori/components/icon/builtin-icons";
import { translate } from "@anori/translations/index";
import { definePlugin, defineWidget } from "@anori/utils/plugins/define";
import type { WidgetConfigurationScreenProps, WidgetRenderProps } from "@anori/utils/plugins/types";
import { useState } from "react";
import { useTranslation } from "react-i18next";

type PicturePluginWidgetConfig = {
  url: string;
};

const PictureConfigScreen = ({
  saveConfiguration,
  currentConfig,
}: WidgetConfigurationScreenProps<PicturePluginWidgetConfig>) => {
  const { t } = useTranslation();
  const [url, setUrl] = useState(currentConfig?.url ?? "https://picsum.photos/800");

  const onConfirm = () => {
    saveConfiguration({
      url: url,
    });
  };

  return (
    <div className="PictureWidget-config">
      <div className="field">
        <label>{t("url")}:</label>
        <Input placeholder="https://example.com/image.jpg" value={url} onChange={(e) => setUrl(e.target.value)} />
      </div>

      <Button className="save-config" onClick={onConfirm}>
        {t("save")}
      </Button>
    </div>
  );
};

const PicturePlugin = ({ config }: WidgetRenderProps<PicturePluginWidgetConfig>) => {
  const { t } = useTranslation();
  return (
    <div className="PictureWidget">
      <img className="Image" src={config.url} alt={t("picture-plugin.name")} />
    </div>
  );
};

const widgetDescriptor = defineWidget({
  id: "widget",
  get name() {
    return translate("picture-plugin.widgetName");
  },
  configurationScreen: PictureConfigScreen,
  mainScreen: PicturePlugin,
  mock: () => {
    return (
      <PicturePlugin
        instanceId="mock"
        config={{
          url: "https://picsum.photos/800",
        }}
      />
    );
  },
  appearance: {
    withoutPadding: true,
    size: {
      width: 2,
      height: 2,
    },
    resizable: true,
  },
});

export const picturePlugin = definePlugin({
  id: "picture-plugin",
  get name() {
    return translate("picture-plugin.name");
  },
  icon: builtinIcons.picture,
  configurationScreen: null,
}).withWidgets(widgetDescriptor);
