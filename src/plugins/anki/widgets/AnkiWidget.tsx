import { Alert } from "@anori/components/Alert";
import { Button } from "@anori/components/Button";
import { Icon } from "@anori/components/icon/Icon";
import { builtinIcons } from "@anori/components/icon/builtin-icons";
import { useWidgetInteractionTracker } from "@anori/utils/analytics";
import type { WidgetRenderProps } from "@anori/utils/plugins/types";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { callAnkiConnectApi, checkAnkiConnectivity, getCardInfo, wrapCardHtml } from "../api";
import type { AnkiCardInfo, AnkiPluginWidgetConfigType } from "../types";
import "./AnkiWidget.scss";

export const MainScreen = ({ config }: WidgetRenderProps<AnkiPluginWidgetConfigType>) => {
  const { t } = useTranslation();

  const [currentCard, setCurrentCard] = useState<AnkiCardInfo | null>(null);
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

          {currentCard?.[currentScreen] ? (
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

export const MockScreen = () => {
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
