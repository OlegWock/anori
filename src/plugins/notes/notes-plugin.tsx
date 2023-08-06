import { Input, Textarea } from "@components/Input";
import { AnoriPlugin, WidgetRenderProps } from "@utils/user-data/types";
import { ComponentProps, useRef, useState } from "react";
import './styles.scss';
import { useWidgetStorage } from "@utils/plugin";
import { translate } from "@translations/index";
import { useTranslation } from "react-i18next";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useRunAfterNextRender } from "@utils/hooks";
import { ReactMarkdownProps } from "react-markdown/lib/complex-types";
import remarkBreaks from "remark-breaks";
import { sequentialNewlinesPlugin } from "./utils";
import { ScrollArea } from "@components/ScrollArea";

type PluginWidgetConfigType = {

};

const Mock = () => {
    const { t } = useTranslation();
    return (<div className="NotesWidget">
        <Input value={t('notes-plugin.exampleTitle')} className="note-title" spellCheck={false} />
        <div className="note-body-rendered">{t('notes-plugin.exampleText')}</div>
    </div>);
};


const Link = (props: ComponentProps<"a"> & ReactMarkdownProps) => {
    return (<Link onClick={e => e.stopPropagation()} onFocus={e => e.stopPropagation()} {...props} />);
}

const MainScreen = ({ config, instanceId }: WidgetRenderProps<PluginWidgetConfigType>) => {
    const switchEditing = (newIsEditing: boolean) => {
        if (newIsEditing) {
            runAfterNextRender(() => {
                if (bodyEditorRef.current) bodyEditorRef.current.focus();
            });
        }
        setIsEditing(newIsEditing);
    };

    const storage = useWidgetStorage<{ title: string, body: string }>();
    const [title, setTitle] = storage.useValue('title', '');
    const [body, setBody] = storage.useValue('body', '');
    const [isEditing, setIsEditing] = useState(false);
    const [titleFocused, setTitleFocused] = useState(false);
    const bodyEditorRef = useRef<HTMLTextAreaElement>(null);
    const { t } = useTranslation();
    const runAfterNextRender = useRunAfterNextRender();

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
        {isEditing && <Textarea
            value={body}
            onValueChange={setBody}
            className="note-body-editor"
            placeholder={t('notes-plugin.noteText')}
            onBlur={() => switchEditing(false)}
            ref={bodyEditorRef}
        />}
        {!isEditing && <div
            className="note-body-rendered"
            tabIndex={0}
            onFocus={() => switchEditing(true)}
            onClick={() => switchEditing(true)}
        >
            <ScrollArea type="hover" color="dark">
                {!!body && <div className="note-body-rendered-content">
                    <ReactMarkdown
                        components={{ a: Link }}
                        remarkPlugins={[sequentialNewlinesPlugin, remarkBreaks, remarkGfm]}
                        children={body}
                    />
                </div>}
            </ScrollArea>
            {!body && <span className="notes-body-placeholder">{t('notes-plugin.noteText')}</span>}
        </div>}
    </div>);
};

export const notesWidgetDescriptor = {
    id: 'notes-widget',
    get name() {
        return translate('notes-plugin.name');
    },
    configurationScreen: null,
    withAnimation: false,
    mainScreen: MainScreen,
    mock: Mock,
    appearance: {
        resizable: {
            min: { width: 2, height: 1 },
        },
        size: {
            width: 2,
            height: 1,
        }
    }
} as const;


export const notesPlugin = {
    id: 'notes-plugin',
    get name() {
        return translate('notes-plugin.name');
    },
    widgets: [
        notesWidgetDescriptor,
    ],
    configurationScreen: null,
} satisfies AnoriPlugin;