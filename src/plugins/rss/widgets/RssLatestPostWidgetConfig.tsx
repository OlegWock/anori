import { Button } from "@anori/components/Button";
import { Input } from "@anori/components/Input";
import type { WidgetConfigurationScreenProps } from "@anori/utils/plugins/types";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { RssLatestPostConfig } from "../types";
import "./RssFeedWidgetConfig.scss";

export const RssLatestPostConfigScreen = ({
  saveConfiguration,
  currentConfig,
}: WidgetConfigurationScreenProps<RssLatestPostConfig>) => {
  const onConfirm = async () => {
    saveConfiguration({ feedUrl });
  };

  const [feedUrl, setFeedUrl] = useState(currentConfig ? currentConfig.feedUrl : "");
  const { t } = useTranslation();

  return (
    <div className="RssFeed-config">
      <div>
        <label>{t("rss-plugin.feedUrl")}:</label>
        <Input value={feedUrl} onValueChange={setFeedUrl} />
      </div>

      <Button className="save-config" onClick={onConfirm}>
        Save
      </Button>
    </div>
  );
};
