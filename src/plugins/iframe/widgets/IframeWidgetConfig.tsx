import "./IframeWidgetConfig.scss";
import { Alert } from "@anori/components/Alert";
import { Button } from "@anori/components/Button";
import { Checkbox } from "@anori/components/Checkbox";
import { Input } from "@anori/components/Input";
import { PickBookmark } from "@anori/components/PickBookmark";
import { Popover } from "@anori/components/Popover";
import type { WidgetConfigurationScreenProps } from "@anori/utils/plugins/types";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { IframePluginWidgetConfig } from "../types";

export const MainWidgetConfigScreen = ({
  saveConfiguration,
  currentConfig,
}: WidgetConfigurationScreenProps<IframePluginWidgetConfig>) => {
  const onConfirm = () => {
    saveConfiguration({ url, title, showLinkToPage });
  };

  const [title, setTitle] = useState(currentConfig?.title || "");
  const [url, setUrl] = useState(currentConfig?.url || "");
  const [showLinkToPage, setShowLinkToPage] = useState(currentConfig?.showLinkToPage ?? true);
  const { t } = useTranslation();

  return (
    <div className="IframeWidget-config">
      <Alert>{t("iframe-plugin.limitations")}</Alert>
      <div className="field">
        <label>
          {t("title")} ({t("canBeEmpty")})
        </label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div className="field">
        <label>{t("url")}:</label>
        <div className="url-import-wrapper">
          <Input value={url} onChange={(e) => setUrl(e.target.value)} />
          <Popover
            component={PickBookmark}
            additionalData={{
              onSelected: (title, url) => {
                console.log("Selected bookmark", title, url);
                setUrl(url);
              },
            }}
          >
            <Button>{t("import")}</Button>
          </Popover>
        </div>
      </div>
      <div className="field">
        <Checkbox checked={showLinkToPage} onChange={setShowLinkToPage}>
          {t("iframe-plugin.showLink")}
        </Checkbox>
      </div>

      <Button className="save-config" onClick={onConfirm}>
        Save
      </Button>
    </div>
  );
};
