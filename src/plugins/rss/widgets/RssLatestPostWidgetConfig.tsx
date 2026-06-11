import { Button } from "@anori/design-system/components/Button/Button";
import { Field } from "@anori/design-system/components/Field/Field";
import { Input } from "@anori/design-system/components/Input/Input";
import type { WidgetConfigScreenProps } from "@anori/utils/plugins/define";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { css } from "styled-system/css";
import type { RssLatestPostConfig } from "../types";

const config = css({ display: "flex", flexDirection: "column", gap: "3", alignItems: "stretch" });
const saveConfig = css({ alignSelf: "flex-end", marginTop: "4" });

export const RssLatestPostConfigScreen = ({
  saveConfiguration,
  currentConfig,
}: WidgetConfigScreenProps<RssLatestPostConfig>) => {
  const onConfirm = async () => {
    const trimmedUrl = feedUrl.trim();
    if (!trimmedUrl) return;
    saveConfiguration({ feedUrl: trimmedUrl });
  };

  const [feedUrl, setFeedUrl] = useState(currentConfig ? currentConfig.feedUrl : "");
  const { t } = useTranslation();

  return (
    <div className={config}>
      <Field label={`${t("rss-plugin.feedUrl")}:`}>
        <Input value={feedUrl} onValueChange={setFeedUrl} />
      </Field>

      <Button className={saveConfig} disabled={!feedUrl.trim()} onClick={onConfirm}>
        {t("save")}
      </Button>
    </div>
  );
};
