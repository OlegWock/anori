import { Alert } from "@anori/components/Alert";
import { Button } from "@anori/components/Button";
import { Icon } from "@anori/components/Icon";
import { translate } from "@anori/translations/index";
import { useAsyncEffect } from "@anori/utils/hooks";
import type {
  AnoriPlugin,
  WidgetConfigurationScreenProps,
  WidgetDescriptor,
  WidgetRenderProps,
} from "@anori/utils/user-data/types";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import "./styles.scss";
import { Select } from "@anori/components/lazy-components";
import { useWidgetInteractionTracker } from "@anori/utils/analytics";
import { builtinIcons } from "@anori/utils/builtin-icons";

type AnkiPluginWidgetConfigType = {
  deckName: string;
};

const callAnkiConnectApi = async <T = void>(action: string, version: number, params?: any): Promise<T> => {
  try {
    const response = await fetch("http://127.0.0.1:8765", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ action, version, params }),
    });

    if (!response.ok) {
      throw new Error("Failed to fetch");
    }
    const data = await response.json();

    if (!data || !(typeof data === "object") || !("error" in data) || !("result" in data)) {
      throw new Error("Response has an unexpected structure");
    }

    if (data.error) {
      throw new Error(String(data.error));
    }

    return data.result as T;
  } catch (error) {
    throw new Error(`Failed to issue request: ${error.message}`);
  }
};

const wrapCardHtml = (html: string) => {
  return `
    <style>
        html, body {
            height: 100%;
            box-sizing: border-box;
        }
        body {
            margin: 0;
        }
        .card {
            min-height: 100%;
            box-sizing: border-box;
            padding: 16px;
        }
    </style>
    <div class="card">
        ${html}
    </div>`;
};

const getCardInfo = async (cardId: number) => {
  const data = await callAnkiConnectApi<any>("cardsInfo", 6, {
    cards: [cardId],
  });
  return data[0];
};

const checkAnkiConnectivity = async () => {
  try {
    await callAnkiConnectApi("version", 6);
    return true;
  } catch (_e) {
    return false;
  }
};

const WidgetConfigScreen = ({
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

const MainScreen = ({ config }: WidgetRenderProps<AnkiPluginWidgetConfigType>) => {
  const { t } = useTranslation();

  const [currentCard, setCurrentCard] = useState<any>({});
  const [cardsToLearn, setCardsToLearn] = useState<number[]>([]);
  const [currentScreen, setCurrentScreen] = useState<"question" | "answer">("question");
  const [reachable, setReachable] = useState(true);

  const pullCards = useCallback(async () => {
    const isReachable = await checkAnkiConnectivity();
    setReachable(isReachable);

    if (!isReachable) {
      setCardsToLearn([]);
      return;
    }

    const data = await callAnkiConnectApi<number[]>("findCards", 6, {
      query: `"deck:${config.deckName}" is:due`,
    });

    setCardsToLearn(data);

    if (data.length === 0) {
      return;
    }

    const cardData = await getCardInfo(data[0]);
    setCurrentCard(cardData);
  }, [config.deckName]);

  useEffect(() => {
    pullCards();
  }, [pullCards]);

  const trackInteraction = useWidgetInteractionTracker();

  const answerCard = async (ease: number) => {
    trackInteraction("Answer card");
    await callAnkiConnectApi("answerCards", 6, {
      answers: [
        {
          cardId: cardsToLearn[0],
          ease: ease,
        },
      ],
    });

    if (cardsToLearn.length === 1) {
      await pullCards();
      return;
    }

    const cardData = await getCardInfo(cardsToLearn[1]);
    setCurrentCard(cardData);
    setCardsToLearn(cardsToLearn.slice(1));
    setCurrentScreen("question");
  };

  return (
    <div className="AnkiWidget">
      {reachable ? (
        <>
          <div className="set-name-line">
            <div className="set-name">{config?.deckName}</div>
            <div className="set-due">
              {cardsToLearn?.length} <Icon icon={builtinIcons.albums} />
            </div>
          </div>

          {currentCard[currentScreen] ? (
            <iframe srcDoc={wrapCardHtml(currentCard[currentScreen])} title="Anki card" />
          ) : (
            <div className="spacer" />
          )}
        </>
      ) : (
        <>
          <Alert>{t("anki-plugin.error")}</Alert>
        </>
      )}

      {reachable && (
        <div className="actions">
          {currentScreen === "question" && (
            <Button onClick={() => setCurrentScreen("answer")}>{t("anki-plugin.showAnswer")}</Button>
          )}

          {currentScreen === "answer" && (
            <>
              <Button onClick={() => answerCard(1)}>{t("anki-plugin.again")}</Button>
              <Button onClick={() => answerCard(2)}>{t("anki-plugin.hard")}</Button>
              <Button onClick={() => answerCard(3)}>{t("anki-plugin.good")}</Button>
              <Button onClick={() => answerCard(4)}>{t("anki-plugin.easy")}</Button>
            </>
          )}
        </div>
      )}
    </div>
  );
};

const MockScreen = () => {
  const { t } = useTranslation();

  return (
    <div className="AnkiWidget">
      <div className="set-name-line">
        <div className="set-name">{t("anki-plugin.deck")}</div>
        <div className="set-due">
          12 <Icon icon={builtinIcons.albums} />
        </div>
      </div>

      <div className="card-question-wrap mock-card">
        <span className="big-kanji">水</span>
        <hr />
        <span>
          みず・したみず・さんずい
          <br />
        </span>
        <strong>water</strong>
      </div>

      <div className="actions">
        <Button>{t("anki-plugin.again")}</Button>
        <Button>{t("anki-plugin.hard")}</Button>
        <Button>{t("anki-plugin.good")}</Button>
        <Button>{t("anki-plugin.easy")}</Button>
      </div>
    </div>
  );
};

const widgetDescriptor = {
  id: "anki-widget",
  get name() {
    return translate("anki-plugin.widgetName");
  },
  configurationScreen: WidgetConfigScreen,
  mainScreen: MainScreen,
  mock: MockScreen,
  appearance: {
    size: {
      width: 2,
      height: 2,
    },
    resizable: {
      min: {
        width: 2,
        height: 2,
      },
      max: {
        width: 4,
        height: 4,
      },
    },
  },
} as const satisfies WidgetDescriptor<any>;

export const ankiPlugin = {
  id: "anki-plugin",
  get name() {
    return translate("anki-plugin.name");
  },
  widgets: [widgetDescriptor],
  configurationScreen: null,
} satisfies AnoriPlugin;
