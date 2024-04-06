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
                <label>{t('url')}:</label>
                <Input placeholder='https://example.com/image.jpg' value={url} onChange={(e) => setUrl(e.target.value)} />
            </div>

        <Button className="save-config" onClick={onConfirm}>{t('save')}</Button>
    </div>);
};

const PicturePlugin = ({ config, instanceId }: WidgetRenderProps<PicturePluginWidgetConfigType>) => {
    return (<div className="PictureWidget">
        <img className="Image" alt="no image set" src={config.url} />
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
        withoutPadding: true,
        size: {
            width: 2,
            height: 2,
        },
        resizable: true,
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