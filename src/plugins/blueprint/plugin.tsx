import { Button } from "@components/Button";
import { AnoriPlugin, WidgetConfigurationScreenProps, OnCommandInputCallback, WidgetRenderProps } from "@utils/user-data/types";
import './styles.scss';
import { getAllWidgetsByPlugin } from "@utils/plugin";
import { translate } from "@translations/index";
import { useTranslation } from "react-i18next";

type PluginWidgetConfigType = {

};


const WidgetConfigScreen = ({ saveConfiguration, currentConfig }: WidgetConfigurationScreenProps<PluginWidgetConfigType>) => {
    const onConfirm = () => {

        saveConfiguration({});
    };

    const { t } = useTranslation();

    return (<div className="PluginWidget-config">
        <div>
            {t('blueprint-plugin.name')}
        </div>

        <Button className="save-config" onClick={onConfirm}>Save</Button>
    </div>);
};

const MainScreen = ({ config, instanceId }: WidgetRenderProps<PluginWidgetConfigType>) => {
    const { t } = useTranslation();
    return (<div className="PluginWidget">
        {t('blueprint-plugin.name')}
    </div>);
};

const onCommandInput: OnCommandInputCallback = async (text: string) => {
    const q = text.toLowerCase();
    const widgets = await getAllWidgetsByPlugin(pluginnamePlugin);

    return [];
};

const widgetDescriptor = {
    id: 'widget',
    get name() {
        return translate('blueprint-plugin.widgetName');
    },
    configurationScreen: WidgetConfigScreen,
    withAnimation: false,
    mainScreen: MainScreen,
    mock: () => {
        return (<MainScreen instanceId="mock" config={{}} />)
    },
    appearance: {
        size: {
            width: 1,
            height: 1,
        },
        resizable: false,
    }
} as const;

export const pluginnamePlugin = {
    id: 'pluginname-plugin',
    get name() {
        return translate('blueprint-plugin.name');
    },
    widgets: [
        widgetDescriptor,
    ],
    onCommandInput,
    configurationScreen: null,
} satisfies AnoriPlugin;