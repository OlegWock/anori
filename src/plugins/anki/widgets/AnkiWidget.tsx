import { Button } from "@anori/design-system/components/Button/Button";
import { builtinIcons } from "@anori/design-system/components/Icon/builtin-icons";
import { Icon } from "@anori/design-system/components/Icon/Icon";
import { useWidgetInteractionTracker } from "@anori/utils/analytics";
import type { WidgetRenderProps } from "@anori/utils/plugins/define";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { css } from "styled-system/css";
import { callAnkiConnectApi, checkAnkiConnectivity, getCardInfo, wrapCardHtml } from "../api";
import type { AnkiCardInfo, AnkiPluginWidgetConfigType } from "../types";
import { AnkiUnreachable } from "./AnkiUnreachable";

const widget = css({ display: "flex", flexDirection: "column", gap: "4", flexGrow: 1, overflow: "hidden" });
const setNameLine = css({
  display: "flex",
  justifyContent: "space-between",
  gap: "4",
  fontWeight: "semibold",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
});
const setName = css({ overflow: "hidden", textOverflow: "ellipsis", fontWeight: "semibold" });
const setDue = css({ display: "flex", alignItems: "center", gap: "1", color: "text.placeholder", lineHeight: "none" });
const cardFrame = css({ flexGrow: 1, borderRadius: "xs", overflow: "hidden" });
const spacer = css({ flexGrow: 1 });
const actions = css({ display: "flex", gap: "2", justifyContent: "center", flexWrap: "wrap" });
const mockCard = css({
  flexGrow: 1,
  overflow: "auto",
  borderRadius: "xs",
  textAlign: "center",
  color: "black",
  backgroundColor: "white",
});
const bigKanji = css({ fontSize: "3xl" });

export const AnkiWidget = ({ config }: WidgetRenderProps<AnkiPluginWidgetConfigType>) => {
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
    <div className={widget}>
      {reachable ? (
        <>
          <div className={setNameLine}>
            <div className={setName}>{config?.deckName}</div>
            <div className={setDue}>
              {cardsToLearn?.length} <Icon icon={builtinIcons.albums} />
            </div>
          </div>

          {currentCard?.[currentScreen] ? (
            <iframe className={cardFrame} srcDoc={wrapCardHtml(currentCard[currentScreen])} title="Anki card" />
          ) : (
            <div className={spacer} />
          )}
        </>
      ) : (
        <AnkiUnreachable />
      )}

      {reachable && (
        <div className={actions}>
          {currentScreen === "question" && (
            <Button variant="frosted" onClick={() => setCurrentScreen("answer")}>
              {t("anki-plugin.showAnswer")}
            </Button>
          )}

          {currentScreen === "answer" && (
            <>
              <Button variant="frosted" onClick={() => answerCard(1)}>
                {t("anki-plugin.again")}
              </Button>
              <Button variant="frosted" onClick={() => answerCard(2)}>
                {t("anki-plugin.hard")}
              </Button>
              <Button variant="frosted" onClick={() => answerCard(3)}>
                {t("anki-plugin.good")}
              </Button>
              <Button variant="frosted" onClick={() => answerCard(4)}>
                {t("anki-plugin.easy")}
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export const AnkiWidgetMock = () => {
  const { t } = useTranslation();

  return (
    <div className={widget}>
      <div className={setNameLine}>
        <div className={setName}>{t("anki-plugin.deck")}</div>
        <div className={setDue}>
          12 <Icon icon={builtinIcons.albums} />
        </div>
      </div>

      <div className={mockCard}>
        <span className={bigKanji}>水</span>
        <hr />
        <span>
          みず・したみず・さんずい
          <br />
        </span>
        <strong>water</strong>
      </div>

      <div className={actions}>
        <Button variant="frosted">{t("anki-plugin.again")}</Button>
        <Button variant="frosted">{t("anki-plugin.hard")}</Button>
        <Button variant="frosted">{t("anki-plugin.good")}</Button>
        <Button variant="frosted">{t("anki-plugin.easy")}</Button>
      </div>
    </div>
  );
};
