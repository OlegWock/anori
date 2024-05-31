import { Button } from "@components/Button";
import { AnoriPlugin, WidgetConfigurationScreenProps, WidgetRenderProps, WidgetDescriptor } from "@utils/user-data/types";
import { translate } from "@translations/index";
import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import { Select } from "@components/Select";
import { Alert } from "@components/Alert";
import { Icon } from "@components/Icon";
import "./styles.scss";

type AnkiPluginWidgetConfigType = {
    deckName: string;
    deckId: number;
};

const invoke = async (action: string, version: number, params?: any) => {
    try {
        const response = await fetch("http://127.0.0.1:8765", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ action, version, params }),
        });

        if (!response.ok) {
            throw new Error('Failed to fetch');
        }
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
}

const WidgetConfigScreen = ({ saveConfiguration, currentConfig }: WidgetConfigurationScreenProps<AnkiPluginWidgetConfigType>) => {
    const [deckName, setDeckName] = useState(currentConfig?.deckName ?? "Default");
    const [deckId, setDeckId] = useState(currentConfig?.deckId ?? 1);
    const [decks, setDecks] = useState<string[]>([]);
    const [reachable, setReachable] = useState(false);

    const onConfirm = () => {
        saveConfiguration({
            deckName: deckName,
            deckId: deckId,
        });
    };

    const { t } = useTranslation();

    useEffect(() => {
        invoke("deckNames", 6).then((data: string[]) => {
            setReachable(true);
            setDecks(data);
        }).catch(err => {
            setReachable(false);
        });
    }, []);

    const updateDeckId = async (name: string) => {
        setDeckName(name);
        const data: any = await invoke("deckNamesAndIds", 6);
        setDeckId(data[name]);
    };

    return (
        <div className="AnkiWidget-config">
            {!reachable && <Alert>{t("anki-plugin.error")}</Alert>}
            <div className="field">
                <label>{t("anki-plugin.deck")}:</label>

                <Select<string> options={decks} value={deckName} onChange={updateDeckId} getOptionKey={(o) => o} getOptionLabel={(o) => o} />
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

    const getCardAndSet = async (card: number) => {
        const data = await invoke("cardsInfo", 6, {
            cards: [card],
        });

        setCurrentCard(data[0]);
    };

    const testReachable = async () => {
        try {
            await invoke("version", 6);
            setReachable(true);
            return true;
        } catch (e) {
            setReachable(false);
            return false;
        }
    };

    const init = async () => {
        const reachable = await testReachable();

        if (!reachable) {
            setCardsToLearn([]);
            return;
        }

        const data: number[] = await invoke("findCards", 6, {
            query: '"deck:' + config.deckName + '" is:due',
        });

        if (data.length == 0) {
            setCardsToLearn([]);
            return;
        }

        setCardsToLearn(data);
        await getCardAndSet(data[0]);
    };

    useEffect(() => {
        init();
    }, [config.deckName]);

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
            await init();
            return;
        }

        getCardAndSet(cardsToLearn[1]);
        setCardsToLearn(cardsToLearn.slice(1));
        setCurrentScreen("question");
    };


    return (<div className="AnkiWidget">
        {reachable ? (<>
            <div className="set-name-line">
                <div className="set-name">{config?.deckName}</div>
                <div className="set-due">{cardsToLearn?.length} <Icon icon="ion:albums" /></div>
            </div>

            {currentCard[currentScreen] ? <iframe srcDoc={wrapCardHtml(currentCard[currentScreen])} /> : <div className="spacer" />}
        </>) : (<>
            <Alert>{t("anki-plugin.error")}</Alert>
        </>)}

        {reachable && (<>
            <div className="actions">
                {currentScreen === 'question' && <Button onClick={() => setCurrentScreen("answer")} >
                    {t("anki-plugin.showAnswer")}
                </Button>}

                {currentScreen === 'answer' && <>
                    <Button onClick={() => answerCard(1)}>
                        {t("anki-plugin.again")}
                    </Button>

                    <Button onClick={() => answerCard(2)}>
                        {t("anki-plugin.hard")}
                    </Button>

                    <Button onClick={() => answerCard(3)}>
                        {t("anki-plugin.good")}
                    </Button>

                    <Button onClick={() => answerCard(4)}>
                        {t("anki-plugin.easy")}
                    </Button>
                </>}
            </div>
        </>)}
    </div>);
};

const MockScreen = () => {
    const { t } = useTranslation();

    return (<div className="AnkiWidget">
        <div className="set-name-line">
            <div className="set-name">{t("anki-plugin.deck")}</div>
            <div className="set-due">12 <Icon icon="ion:albums" /></div>
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
    </div>);
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
