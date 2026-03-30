import { Alert } from "@anori/components/Alert";
import { Button } from "@anori/components/Button";
import { Select } from "@anori/components/lazy-components";
import { useAsyncEffect } from "@anori/utils/hooks";
import type { WidgetConfigurationScreenProps } from "@anori/utils/plugins/types";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { callAnkiConnectApi } from "../api";
import type { AnkiPluginWidgetConfigType } from "../types";
import "./AnkiWidgetConfig.scss";

export const WidgetConfigScreen = ({
  saveConfiguration,
  currentConfig,
}: WidgetConfigurationScreenProps<AnkiPluginWidgetConfigType>) => {
  const [deckName, setDeckName] = useState(currentConfig?.deckName ?? "Default");
  const [decks, setDecks] = useState<Record<string, number>>({});
  const [reachable, setReachable] = useState(false);

  const onConfirm = () => {
    saveConfiguration({
      deckName: deckName,
    });
  };

  const { t } = useTranslation();

  useAsyncEffect(async () => {
    try {
      const data = await callAnkiConnectApi<Record<string, number>>("deckNamesAndIds", 6);
      setReachable(true);
      setDecks(data);
    } catch (_err) {
      setReachable(false);
    }
  }, []);

  return (
    <div className="AnkiWidget-config">
      {!reachable && <Alert>{t("anki-plugin.error")}</Alert>}
      <div className="field">
        <label>{t("anki-plugin.deck")}:</label>

        <Select<string>
          options={Object.keys(decks)}
          value={deckName}
          onChange={setDeckName}
          getOptionKey={(o) => o}
          getOptionLabel={(o) => o}
        />
      </div>

      <Button className="save-config" onClick={onConfirm} disabled={!reachable}>
        Save
      </Button>
    </div>
  );
};
