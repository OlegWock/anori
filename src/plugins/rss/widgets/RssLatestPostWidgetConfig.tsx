import { Button } from "@anori/design-system/components/Button/Button";
import { Field } from "@anori/design-system/components/Field/Field";
import { Input } from "@anori/design-system/components/Input/Input";
import type { WidgetConfigurationScreenProps } from "@anori/utils/plugins/types";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { css } from "styled-system/css";
import type { RssLatestPostConfig } from "../types";

const config = css({ display: "flex", flexDirection: "column", gap: "3", alignItems: "stretch" });
const saveConfig = css({ alignSelf: "flex-end", marginTop: "4" });

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
    <div className={config}>
      <Field label={`${t("rss-plugin.feedUrl")}:`}>
        <Input value={feedUrl} onValueChange={setFeedUrl} />
      </Field>

      <Button className={saveConfig} onClick={onConfirm}>
        {t("save")}
      </Button>
    </div>
  );
};
