import { Button } from "@components/Button";
import { AnoriPlugin, WidgetConfigurationScreenProps, WidgetRenderProps, WidgetDescriptor } from "@utils/user-data/types";
import { Input } from "@components/Input";
import { Textarea } from "@components/Input";
import './styles.scss';
import { useTranslation } from "react-i18next";
import { useRef, useState } from "react";
import { WidgetExpandAreaRef } from "@components/WidgetExpandArea";
import { translate } from "@translations/index";

type labelWidgetConfigType = {
    title: string,
    description: string,
};

const LabelScreen = ({ config, instanceId }: WidgetRenderProps<labelWidgetConfigType>) => {
    const [showExpandableArea, setShowExpandableArea] = useState(false);
    const expandAreaRef = useRef<WidgetExpandAreaRef>(null);

    return (<div className="ExpandableTestWidget" onClick={() => showExpandableArea ? expandAreaRef.current?.focus(true) : setShowExpandableArea(true)}>
        <div className="text">
            <h1 className="label">{ config.title }</h1>
            <div className="label_span">{ config.description }</div>
        </div>
    </div>);
};

const labelConfigurationScreen = ({ saveConfiguration, currentConfig }: WidgetConfigurationScreenProps<labelWidgetConfigType>) => {
    const onConfirm = () => {
        saveConfiguration({ title, description });
    };

    const [title, setTitle] = useState(currentConfig?.title ?? '');
    const [description, setDescription] = useState(currentConfig?.description ?? '');
    const { t } = useTranslation();

    return (
        <div className="LabelWidget-config">
            <div className="field">
                <label>{t('title')}:</label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>

            <div className="field">
                <label>{t('label-plugin.text')}:</label>
                <Textarea rows={4} value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>

            <div className="save-config">
                <Button onClick={onConfirm}>{t('save')}</Button>
            </div>
        </div>
    );
};

const widgetDescriptor = {
    id: 'widget',
    get name() {
        return translate('label-plugin.label');
    },
    configurationScreen: labelConfigurationScreen,
    mainScreen: ({ config, instanceId }: WidgetRenderProps<labelWidgetConfigType>) => {
        const { t } = useTranslation();
        return (
            <LabelScreen instanceId={instanceId} config={config} />
        );
    },
    mock: () => {
        return (<LabelScreen instanceId="mock" config={{
            title: 'Title',
            description: 'Description',
        }} />)
    },
    appearance: {
        size: {
            width: 2,
            height: 1,
        },
        resizable: {
            min: {
                width: 1,
                height: 1,
            },
            max: {
                width: 8,
                height: 1,
            }
        },
        withHoverAnimation: false,
        withoutPadding: true,
    }
} as const satisfies WidgetDescriptor<any>;

export const LabelPlugin = {
    id: 'label-plugin',
    get name() {
        return translate('label-plugin.name');
    },
    widgets: [
        widgetDescriptor,
    ],
    configurationScreen: null,
} satisfies AnoriPlugin;