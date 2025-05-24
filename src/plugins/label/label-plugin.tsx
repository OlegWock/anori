import { Button } from "@components/Button";
import {
  AnoriPlugin,
  WidgetConfigurationScreenProps,
  WidgetRenderProps,
  WidgetDescriptor,
} from "@utils/user-data/types";
import { Input } from "@components/Input";
import { Textarea } from "@components/Input";
import "./styles.scss";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { translate } from "@translations/index";

type LabelWidgetConfigType = {
  title: string;
  description: string;
};

const LabelScreen = ({ config, instanceId }: WidgetRenderProps<LabelWidgetConfigType>) => {
  return (
    <div className="LabelScreen">
      <div className="text">
        <h1 className="label">{config.title}</h1>
        <div className="description">{config.description}</div>
      </div>
    </div>
  );
};

const LabelConfigurationScreen = ({
  saveConfiguration,
  currentConfig,
}: WidgetConfigurationScreenProps<LabelWidgetConfigType>) => {
  const onConfirm = () => {
    saveConfiguration({ title, description });
  };

  const [title, setTitle] = useState(currentConfig?.title ?? "");
  const [description, setDescription] = useState(currentConfig?.description ?? "");
  const { t } = useTranslation();

  return (
    <div className="LabelWidget-config">
      <div className="field">
        <label>{t("title")}:</label>
        <Input placeholder={t("title")} value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>

      <div className="field">
        <label>{t("label-plugin.text")}:</label>
        <Textarea
          placeholder={t("label-plugin.text")}
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      <div className="save-config">
        <Button onClick={onConfirm}>{t("save")}</Button>
      </div>
    </div>
  );
};

const widgetDescriptor = {
  id: "widget",
  get name() {
    return translate("label-plugin.label");
  },
  configurationScreen: LabelConfigurationScreen,
  mainScreen: LabelScreen,
  mock: () => {
    const { t } = useTranslation();
    return (
      <LabelScreen
        instanceId="mock"
        config={{
          title: t("title"),
          description: t("label-plugin.text"),
        }}
      />
    );
  },
  appearance: {
    size: {
      width: 2,
      height: 1,
    },
    resizable: {
      min: {
        width: 1,
        height: 1,
      },
      max: {
        width: 8,
        height: 1,
      },
    },
    withHoverAnimation: false,
    withoutPadding: false,
  },
} as const satisfies WidgetDescriptor<any>;

export const labelPlugin = {
  id: "label-plugin",
  get name() {
    return translate("label-plugin.name");
  },
  widgets: [widgetDescriptor],
  configurationScreen: null,
} satisfies AnoriPlugin;
