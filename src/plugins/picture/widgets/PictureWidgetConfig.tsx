import { Button } from "@anori/components/Button";
import { Input } from "@anori/components/Input";
import type { WidgetConfigurationScreenProps } from "@anori/utils/plugins/types";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { PicturePluginWidgetConfig } from "../types";
import "./PictureWidgetConfig.scss";

export const PictureConfigScreen = ({
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
