import { Input, Textarea } from "@components/Input";
import { AnoriPlugin, WidgetRenderProps } from "@utils/user-data/types";
import { useState } from "react";
import './styles.scss';
import { useWidgetStorage } from "@utils/plugin";

type PluginWidgetConfigType = {

};

const Mock = () => {
    return (<div className="NotesWidget">
        <Input value="Shopping list" className="note-title" spellCheck={false} />
        <Textarea value="Veryyyyyyyyy long shopping list. Believe me." className="note-body" spellCheck={false} />
    </div>);
};

const MainScreen = ({ config, instanceId }: WidgetRenderProps<PluginWidgetConfigType>) => {
    const storage = useWidgetStorage<{title: string, body: string}>();
    const [title, setTitle] = storage.useValue('title', '');
    const [body, setBody] = storage.useValue('body', '');
    const [titleFocused, setTitleFocused] = useState(false);
    const [bodyFocused, setBodyFocused] = useState(false);

    return (<div className="NotesWidget">
        <Input
            value={title}
            onValueChange={setTitle}
            className="note-title"
            placeholder="Note title"
            spellCheck={titleFocused}
            onFocus={() => setTitleFocused(true)}
            onBlur={() => setTitleFocused(false)}
        />
        <Textarea
            value={body}
            onValueChange={setBody}
            className="note-body"
            placeholder="Text of note..."
            spellCheck={bodyFocused}
            onFocus={() => setBodyFocused(true)}
            onBlur={() => setBodyFocused(false)}
        />
    </div>);
};

const widgetDescriptorS = {
    id: 'notes-s',
    name: 'Notes - size s',
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
    name: 'Notes - size m',
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
    name: 'Notes - size l',
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
    name: 'Notes',
    widgets: [
        widgetDescriptorS,
        widgetDescriptorM,
        widgetDescriptorL,
    ],
    configurationScreen: null,
} satisfies AnoriPlugin;