import { Button } from "@components/Button";
import { Input } from "@components/Input";
import { AnoriPlugin, WidgetConfigurationScreenProps, OnCommandInputCallback, WidgetRenderProps } from "@utils/user-data/types";
import { useState } from "react";
import './styles.scss';
import { Popover } from "@components/Popover";
import { IconPicker } from "@components/IconPicker";
import { Icon } from "@components/Icon";
import { useMemo } from "react";
import clsx from "clsx";
import { getAllWidgetsByPlugin } from "@utils/plugin";

type BookmarkWidgetConfigType = {
    url: string,
    title: string,
    icon: string,
};

const parseHost = (url: string) => {
    try {
        return new URL(url).hostname;
    } catch (err) {
        return `Couldn't parse hostname`
    }
}

const WidgetConfigScreen = ({ saveConfiguration, currentConfig }: WidgetConfigurationScreenProps<BookmarkWidgetConfigType>) => {
    const onConfirm = () => {
        if (!title || !url) return;

        saveConfiguration({ title, url, icon });
    };
    const [title, setTitle] = useState(currentConfig?.title || 'Example');
    const [url, setUrl] = useState(currentConfig?.url || 'http://example.com');
    const [icon, setIcon] = useState(currentConfig?.icon || 'ion:dice');

    return (<div className="BookmarkWidget-config">
        <div>
            <label>Icon:</label>
            <Popover
                component={IconPicker}
                additionalData={{
                    onSelected: setIcon,
                }}
            >
                <Button className="icon-picker-trigger"><Icon icon={icon} width={48} /></Button>
            </Popover>
        </div>
        <div>
            <label>Title:</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
            <label>URL:</label>
            <Input value={url} onChange={(e) => setUrl(e.target.value)} />
        </div>

        <Button className="save-config" onClick={onConfirm}>Save</Button>
    </div>);
};

const MainScreen = ({ config, isMock, size }: WidgetRenderProps<BookmarkWidgetConfigType> & { isMock?: boolean, size: 's' | 'm' }) => {
    const host = useMemo(() => parseHost(config.url), [config.url]);

    return (<a className={clsx(['BookmarkWidget', `size-${size}`])} href={isMock ? undefined : config.url}>
        <div className="text">
            <h2>{config.title}</h2>
            <div className="host">{host}</div>
        </div>
        <Icon icon={config.icon} width={size === 'm' ? 92 : 36} height={size === 'm' ? 92 : 36} />
    </a>);
};

const onCommandInput: OnCommandInputCallback = async (text: string) => {
    const q = text.toLowerCase();
    const widgets = await getAllWidgetsByPlugin(bookmarkPlugin);

    return widgets.filter(w => {
        const { url, title, icon } = w.configutation;
        const inUrl = url.toLowerCase().includes(q);
        const inTitle = title.toLowerCase().includes(q);
        const inIcon = icon.toLowerCase().includes(q);

        return inUrl || inTitle || inIcon;
    }).map(w => {
        const { url, title, icon } = w.configutation;
        const host = parseHost(url);
        return {
            icon,
            text: title,
            hint: host,
            key: w.instanceId,
            onSelected: () => {
                window.location.href = url;
            }
        };
    });
};

const widgetSizeSDescriptor = {
    id: 'bookmark-s',
    name: 'Bookmark - size s',
    configurationScreen: WidgetConfigScreen,
    withAnimation: true,
    mainScreen: ({ config, instanceId }: WidgetRenderProps<BookmarkWidgetConfigType>) => {
        return <MainScreen instanceId={instanceId} config={config} isMock={false} size="s" />
    },
    mock: () => {
        return (<MainScreen instanceId="" size="s" isMock config={{
            url: 'http://example.com',
            title: 'Example',
            icon: 'ion:dice'
        }} />)
    },
    size: {
        width: 1,
        height: 1,
    }
} as const;

const widgetSizeMDescriptor = {
    id: 'bookmark-m',
    name: 'Bookmark - size m',
    configurationScreen: WidgetConfigScreen,
    withAnimation: true,
    mainScreen: ({ config, instanceId }: WidgetRenderProps<BookmarkWidgetConfigType>) => {
        return <MainScreen instanceId={instanceId} config={config} isMock={false} size="m" />
    },
    mock: () => {
        return (<MainScreen instanceId="" size="m" isMock config={{
            url: 'http://example.com',
            title: 'Example',
            icon: 'ion:dice'
        }} />)
    },
    size: {
        width: 2,
        height: 1,
    }
} as const;

export const bookmarkPlugin = {
    id: 'bookmark-plugin',
    name: 'Bookmarks',
    widgets: [
        widgetSizeSDescriptor,
        widgetSizeMDescriptor,
    ],
    onCommandInput,
    configurationScreen: null,
} satisfies AnoriPlugin;