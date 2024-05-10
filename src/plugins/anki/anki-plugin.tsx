import { Button } from "@components/Button";
import {
  AnoriPlugin,
  WidgetConfigurationScreenProps,
  WidgetRenderProps,
  WidgetDescriptor,
} from "@utils/user-data/types";
import "./styles.scss";
import { translate } from "@translations/index";
import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import { Select } from "@components/Select";
import { Alert } from "@components/Alert";

type AnkiPluginWidgetConfigType = {
  deckName: string;
  deckId: number;
};

const invoke = async(action: string, version: number, params?: any) => {
    try {
        const response = await fetch("http://127.0.0.1:8765", {
            method: "POST",
            headers: {
            "Content-Type": "application/json",
            },
            body: JSON.stringify({ action, version, params }),
        });

        const data = await response.json();

        if (!data || !("error" in data) || !("result" in data)) {
            throw new Error("Response has an unexpected structure");
        }

        if (data.error) {
            throw new Error(data.error);
        }

        return data.result;
    } catch (error) {
        throw new Error("Failed to issue request: " + error.message);
    }
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

  useEffect(() => {
    invoke("deckNames", 6).then((data: string[]) => {
      setDecks(data);
    });
  }, []);

  const updateDeckId = async (name: string) => {
    setDeckName(name);
    const data: any = await invoke("deckNamesAndIds", 6);
    setDeckId(data[name]);
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
        invoke("cardsInfo", 6, {
        cards: [card],
        }).then((data: any[]) => {
        const d = data[0];

        d.question = { __html: d.question };
        d.answer = { __html: d.answer };

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

    const answerCard = async (ease: number) => {
        await invoke("answerCards", 6, {
        answers: [
            {
            cardId: cardsToLearn[0],
            ease: ease,
            },
        ],
        });

        if (cardsToLearn.length == 1) {
        init();
        return;
        }

        getCardAndSet(cardsToLearn[1]);
        setCardsToLearn(cardsToLearn.slice(1));
        setDisplay("question");
    };

    const again = async () => {
        await answerCard(1);
    };

    const hard = async () => {
        await answerCard(2);
    };

        const good = async () => {
            await answerCard(3);
        };

    const easy = async () => {
        await answerCard(4);
    };

    return (
    <div className="AnkiWidget">

      {reachable ? (<div>
          <p
            className="set-name-line"
          >
            <span className="set-name">{config?.deckName}</span>
            <span>(Due: {cardsToLearn?.length})</span>
          </p>

          <div className="card">
            <div
              className="card-question-wrap"
              dangerouslySetInnerHTML={currentCard[display]}
            ></div>
          </div>
        </div>) : (<div>
            <Alert>{t("anki-plugin.error")}</Alert>
        </div>)}


      {reachable && <>
          <div className="actions">
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
        </>}

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
    return translate("anki-plugin.name");
  },
  widgets: [widgetDescriptor],
  configurationScreen: null,
} satisfies AnoriPlugin;
