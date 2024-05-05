import { Button } from "@components/Button";
import {
  AnoriPlugin,
  WidgetConfigurationScreenProps,
  OnCommandInputCallback,
  WidgetRenderProps,
  WidgetDescriptor,
} from "@utils/user-data/types";
import "./styles.scss";
import { getAllWidgetsByPlugin } from "@utils/plugin";
import { translate } from "@translations/index";
import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import { Select } from "@components/Select";

type AnkiPluginWidgetConfigType = {
  deckName: string;
  deckId: number;
};

function invoke(action: string, version: number, params = {}) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.addEventListener("error", () => reject("failed to issue request"));
    xhr.addEventListener("load", () => {
      try {
        const response = JSON.parse(xhr.responseText);
        if (Object.getOwnPropertyNames(response).length != 2) {
          throw "response has an unexpected number of fields";
        }
        if (!Object.prototype.hasOwnProperty.call(response, "error")) {
          throw "response is missing required error field";
        }
        if (!Object.prototype.hasOwnProperty.call(response, "result")) {
          throw "response is missing required result field";
        }
        if (response.error) {
          throw response.error;
        }
        resolve(response.result);
      } catch (e) {
        reject(e);
      }
    });

    xhr.open("POST", "http://127.0.0.1:8765");
    xhr.send(JSON.stringify({ action, version, params }));
  });
}

const WidgetConfigScreen = ({
  saveConfiguration,
  currentConfig,
}: WidgetConfigurationScreenProps<AnkiPluginWidgetConfigType>) => {
  const [deckName, setDeckName] = useState(
    currentConfig?.deckName ?? "Default",
  );
  const [deckId, setDeckId] = useState(currentConfig?.deckId ?? 1);
  const [decks, setDecks] = useState<string[]>([]);

  const onConfirm = () => {
    saveConfiguration({
      deckName: deckName,
      deckId: deckId,
    });
  };

  const { t } = useTranslation();

  invoke("deckNames", 6).then((data: string[]) => {
    setDecks(data);
  });

  const updateDeckId = (name: string) => {
    setDeckName(name);
    invoke("deckNamesAndIds", 6).then((data: any) => {
      setDeckId(data[name]);
    });
  };

  return (
    <div className="AnkiWidget-config">
      <div>{t("anki-plugin.name")}</div>

      <div className="field">
        <label>{t("anki-plugin.deck")}:</label>

        <Select<string>
          options={decks}
          value={deckName}
          onChange={updateDeckId}
          getOptionKey={(o) => o}
          getOptionLabel={(o) => o}
        />
      </div>

      <Button className="save-config" onClick={onConfirm}>
        Save
      </Button>
    </div>
  );
};

const MainScreen = ({
  config,
  instanceId,
}: WidgetRenderProps<AnkiPluginWidgetConfigType>) => {
  const { t } = useTranslation();

  const [currentCard, setCurrentCard] = useState<any>({});
  const [cardsToLearn, setCardsToLearn] = useState<number[]>([]);
  const [display, setDisplay] = useState("question");
  const [reachable, setReachable] = useState(true);

  const getCardAndSet = (card: number) => {
    console.log(card);
    invoke("cardsInfo", 6, {
      cards: [card],
    }).then((data: any[]) => {
      const d = data[0];

      d.question = { __html: d.question };
      d.answer = { __html: d.answer };

      console.log(d);
      setCurrentCard(d);
    });
  };

  const init = () => {
    invoke("findCards", 6, {
      query: '"deck:' + config?.deckName + '" is:due',
    })
      .catch((e) => {
        setReachable(false);
      })
      .then((data: number[]) => {
        if (reachable) {
          setCardsToLearn(data);
          getCardAndSet(data[0]);
        } else {
          setCardsToLearn([]);
        }
      });
  };

  useEffect(init, []);

  const again = () => {
    invoke("answerCards", 6, {
      answers: [
        {
          cardId: cardsToLearn[0],
          ease: 1,
        },
      ],
    }).then((data) => {
      if (cardsToLearn.length == 1) {
        init();
        return;
      }
      getCardAndSet(cardsToLearn[1]);
      setCardsToLearn(cardsToLearn.slice(1));
      setDisplay("question");
    });
  };

  const easy = () => {
    invoke("answerCards", 6, {
      answers: [
        {
          cardId: cardsToLearn[0],
          ease: 4,
        },
      ],
    }).then((data) => {
      if (cardsToLearn.length == 1) {
        init();
        return;
      }
      getCardAndSet(cardsToLearn[1]);
      setCardsToLearn(cardsToLearn.slice(1));
      setDisplay("question");
    });
  };

  return (
    <div className="AnkiWidget">
      <p
        className="setNameLine"
        style={{ display: reachable ? "block" : "none" }}
      >
        <span className="setName">{config?.deckName}</span>
        <span>(Due: {cardsToLearn?.length})</span>
      </p>

      <div style={{ display: reachable ? "block" : "none" }} className="card">
        <div
          className="card_question_wrap"
          dangerouslySetInnerHTML={currentCard[display]}
        ></div>
      </div>

      <div style={{ display: reachable ? "none" : "block" }}>
        <p>{t("anki-plugin.error")}</p>
      </div>

      <div className="actions" style={{ display: reachable ? "flex" : "none" }}>
        <Button
          style={{ display: display === "question" ? "block" : "none" }}
          onClick={() => {
            if (display === "question") {
              setDisplay("answer");
            } else {
              setDisplay("question");
            }
          }}
        >
          {t("anki-plugin.showAnswer")}
        </Button>

        <Button
          style={{ display: display === "question" ? "none" : "block" }}
          onClick={easy}
        >
          {t("anki-plugin.easy")}
        </Button>
        <Button
          style={{ display: display === "question" ? "none" : "block" }}
          onClick={again}
        >
          {t("anki-plugin.again")}
        </Button>
      </div>
    </div>
  );
};

const onCommandInput: OnCommandInputCallback = async (text: string) => {
  const q = text.toLowerCase();
  const widgets = await getAllWidgetsByPlugin(ankiPlugin);

  return [];
};

const widgetDescriptor = {
  id: "widget",
  get name() {
    return translate("anki-plugin.widgetName");
  },
  configurationScreen: WidgetConfigScreen,
  mainScreen: MainScreen,
  mock: () => {
    return (
      <MainScreen
        instanceId="mock"
        config={{
          deckName: "Default",
          deckId: 1,
        }}
      />
    );
  },
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
        height: 2,
      },
    },
  },
} as const satisfies WidgetDescriptor<any>;

export const ankiPlugin = {
  id: "anki-plugin",
  get name() {
    // TODO: return translate("anki-plugin.name");
    return "anki";
  },
  widgets: [widgetDescriptor],
  onCommandInput,
  configurationScreen: null,
} satisfies AnoriPlugin;
