import { Input, Textarea } from "@components/Input";
import { AnoriPlugin, WidgetRenderProps } from "@utils/user-data/types";
import { useState } from "react";
import './styles.scss';
import { useWidgetStorage } from "@utils/plugin";
import { translate } from "@translations/index";
import { useTranslation } from "react-i18next";

type PluginWidgetConfigType = {

};

const Mock = () => {
    const { t } = useTranslation();
    return (<div className="NotesWidget">
        <Input value={t('notes-plugin.exampleTitle')} className="note-title" spellCheck={false} />
        <Textarea value={t('notes-plugin.exampleText')} className="note-body" spellCheck={false} />
    </div>);
};

const MainScreen = ({ config, instanceId }: WidgetRenderProps<PluginWidgetConfigType>) => {
    const storage = useWidgetStorage<{title: string, body: string}>();
    const [title, setTitle] = storage.useValue('title', '');
    const [body, setBody] = storage.useValue('body', '');
    const [titleFocused, setTitleFocused] = useState(false);
    const [bodyFocused, setBodyFocused] = useState(false);
    const { t } = useTranslation();

    return (<div className="NotesWidget">
        <Input
            value={title}
            onValueChange={setTitle}
            className="note-title"
            placeholder={t('notes-plugin.noteTitle')}
            spellCheck={titleFocused}
            onFocus={() => setTitleFocused(true)}
            onBlur={() => setTitleFocused(false)}
        />
        <Textarea
            value={body}
            onValueChange={setBody}
            className="note-body"
            placeholder={t('notes-plugin.noteText')}
            spellCheck={bodyFocused}
            onFocus={() => setBodyFocused(true)}
            onBlur={() => setBodyFocused(false)}
        />
    </div>);
};

const widgetDescriptorS = {
    id: 'notes-s',
    get name() {
        return translate('notes-plugin.widgetSizeSName');
    },
    configurationScreen: null,
    withAnimation: false,
    mainScreen: MainScreen,
    mock: Mock,
    size: {
        width: 2,
        height: 1,
    }
} as const;

const widgetDescriptorM = {
    id: 'notes-m',
    get name() {
        return translate('notes-plugin.widgetSizeMName');
    },
    configurationScreen: null,
    withAnimation: false,
    mainScreen: MainScreen,
    mock: Mock,
    size: {
        width: 2,
        height: 2,
    }
} as const;

const widgetDescriptorL = {
    id: 'notes-l',
    get name() {
        return translate('notes-plugin.widgetSizeLName');
    },
    configurationScreen: null,
    withAnimation: false,
    mainScreen: MainScreen,
    mock: Mock,
    size: {
        width: 3,
        height: 2,
    }
} as const;



export const notesPlugin = {
    id: 'notes-plugin',
    get name() {
        return translate('notes-plugin.name');
    },
    widgets: [
        widgetDescriptorS,
        widgetDescriptorM,
        widgetDescriptorL,
    ],
    configurationScreen: null,
} satisfies AnoriPlugin;