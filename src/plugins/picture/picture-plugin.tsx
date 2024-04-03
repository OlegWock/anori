import { Button } from "@components/Button";
import { AnoriPlugin, WidgetConfigurationScreenProps, WidgetRenderProps, WidgetDescriptor } from "@utils/user-data/types";
import './styles.scss';
import { translate } from "@translations/index";
import { useTranslation } from "react-i18next";
import { Input } from "@components/Input";
import { useState } from "react";
import browser from 'webextension-polyfill';

type PicturePluginWidgetConfigType = {
    url: string
};

const PictureConfigScreen = ({ saveConfiguration, currentConfig }: WidgetConfigurationScreenProps<PicturePluginWidgetConfigType>) => {
    const { t } = useTranslation();
    const [url, setUrl] = useState(currentConfig?.url ?? 'https://source.unsplash.com/random/256x256');

    const onConfirm = () => {

        saveConfiguration({
            url: url,
        });
    };


    return (<div className="PictureWidget-config">
        <div className="field">
                <label>url:</label>
                <Input placeholder='https://example.com/image.jpg' value={url} onChange={(e) => setUrl(e.target.value)} />
            </div>

        <Button className="save-config" onClick={onConfirm}>Save</Button>
    </div>);
};

const PicturePlugin = ({ config, instanceId }: WidgetRenderProps<PicturePluginWidgetConfigType>) => {
    const deerExampleImage = browser.runtime.getURL('/assets/images/picturePreview.jpg')
    return (<div className="PictureWidget">
        <img className="Image" src={config.url !== '' ? config.url : deerExampleImage} />
    </div>);
};

const widgetDescriptor = {
    id: 'widget',
    get name() {
        return translate('picture-plugin.widgetName');
    },
    configurationScreen: PictureConfigScreen,
    mainScreen: PicturePlugin,
    mock: () => {
        const deerExampleImage = browser.runtime.getURL('/assets/images/picturePreview.jpg')
        return (<PicturePlugin instanceId="mock" config={{
            url: deerExampleImage
        }} />)
    },
    appearance: {
        size: {
            width: 2,
            height: 2,
        },
        resizable: {
            min: {
                width: 1,
                height: 1,
            },
            max: {
                width: 4,
                height: 4,
            }
        }
    }
} as const satisfies WidgetDescriptor<any>;

export const picturePlugin = {
    id: 'picture-plugin',
    get name() {
        return translate('picture-plugin.name');
    },
    widgets: [
        widgetDescriptor,
    ],
    configurationScreen: null,
} satisfies AnoriPlugin;