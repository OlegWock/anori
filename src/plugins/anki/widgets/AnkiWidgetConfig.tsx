import { Select } from "@anori/components/lazy-components";
import { Button } from "@anori/design-system/components/Button/Button";
import { Field } from "@anori/design-system/components/Field/Field";
import { useAsyncEffect } from "@anori/utils/hooks";
import type { WidgetConfigScreenProps } from "@anori/utils/plugins/define";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { css } from "styled-system/css";
import { callAnkiConnectApi } from "../api";
import type { AnkiPluginWidgetConfigType } from "../types";
import { AnkiUnreachable } from "./AnkiUnreachable";

const config = css({ display: "flex", flexDirection: "column", gap: "3", alignItems: "stretch" });
const saveConfig = css({ alignSelf: "center", marginTop: "4" });

export const WidgetConfigScreen = ({
  saveConfiguration,
  currentConfig,
}: WidgetConfigScreenProps<AnkiPluginWidgetConfigType>) => {
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

  if (!reachable) return <AnkiUnreachable />;

  return (
    <div className={config}>
      <Field label={`${t("anki-plugin.deck")}:`}>
        <Select<string>
          options={Object.keys(decks)}
          value={deckName}
          onChange={setDeckName}
          getOptionKey={(o) => o}
          getOptionLabel={(o) => o}
        />
      </Field>

      <Button variant="frosted" className={saveConfig} onClick={onConfirm}>
        Save
      </Button>
    </div>
  );
};
