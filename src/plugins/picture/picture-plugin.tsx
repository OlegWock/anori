import { Button } from "@components/Button";
import type {
  AnoriPlugin,
  WidgetConfigurationScreenProps,
  WidgetDescriptor,
  WidgetRenderProps,
} from "@utils/user-data/types";
import "./styles.scss";
import { Input } from "@components/Input";
import { translate } from "@translations/index";
import { useState } from "react";
import { useTranslation } from "react-i18next";

type PicturePluginWidgetConfigType = {
  url: string;
};

const PictureConfigScreen = ({
  saveConfiguration,
  currentConfig,
}: WidgetConfigurationScreenProps<PicturePluginWidgetConfigType>) => {
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

const PicturePlugin = ({ config }: WidgetRenderProps<PicturePluginWidgetConfigType>) => {
  const { t } = useTranslation();
  return (
    <div className="PictureWidget">
      <img className="Image" src={config.url} alt={t("picture-plugin.name")} />
    </div>
  );
};

const widgetDescriptor = {
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
} as const satisfies WidgetDescriptor<any>;

export const picturePlugin = {
  id: "picture-plugin",
  get name() {
    return translate("picture-plugin.name");
  },
  widgets: [widgetDescriptor],
  configurationScreen: null,
} satisfies AnoriPlugin;
