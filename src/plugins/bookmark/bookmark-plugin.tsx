import { Button } from "@components/Button";
import { Input } from "@components/Input";
import { AodakePlugin, WidgetConfigurationProps, WidgetRenderProps } from "@utils/user-data/types";
import { useState } from "react";
import './styles.scss';
import { Popover } from "@components/Popover";
import { IconPicker } from "@components/IconPicker";
import { Icon } from "@components/Icon";
import { useMemo } from "react";
import clsx from "clsx";

type ExampleConfigType = {
    url: string,
    title: string,
    icon: string,
};

const ConfigScreen = ({ saveConfiguration, currentConfig }: WidgetConfigurationProps<ExampleConfigType>) => {
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
                <Button><Icon icon={icon} width={48} /></Button>
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

const MainScreen = ({ config, isMock, size }: WidgetRenderProps<ExampleConfigType> & { isMock?: boolean, size: 's' | 'm' }) => {
    const host = useMemo(() => {
        try {
            return new URL(config.url).hostname;
        } catch (err) {
            return `Couldn't parse hostname`
        }
    }, [config.url])

    return (<a className={clsx(['BookmarkWidget', `size-${size}`])} href={isMock ? undefined : config.url}>
        <div className="text">
            <h3>{config.title}</h3>
            <div className="host">{host}</div>
        </div>
        <Icon icon={config.icon} width={size === 'm' ? 92 : 36} height={size === 'm' ? 92 : 36} />
    </a>);
};

export const bookmarkPlugin = {
    id: 'bookmark-plugin',
    name: 'Bookmarks',
    widgets: [{
        id: 'bookmark-s',
        name: 'Bookmark - size s',
        configurationScreen: ConfigScreen,
        mainScreen: ({ config, instanceId }: WidgetRenderProps<ExampleConfigType>) => {
            return <MainScreen instanceId={instanceId} config={config} isMock={false} size="s" />
        },
        mock: () => {
            return (<MainScreen instanceId="" size="s" isMock config={{
                url: 'http://example.com',
                title: 'Site name',
                icon: 'ion:dice'
            }} />)
        },
        size: {
            width: 1,
            height: 1,
        }
    }, {
        id: 'bookmark-m',
        name: 'Bookmark - size m',
        configurationScreen: ConfigScreen,
        mainScreen: ({ config, instanceId }: WidgetRenderProps<ExampleConfigType>) => {
            return <MainScreen instanceId={instanceId} config={config} isMock={false} size="m" />
        },
        mock: () => {
            return (<MainScreen instanceId="" size="m" isMock config={{
                url: 'http://example.com',
                title: 'Site name',
                icon: 'ion:dice'
            }} />)
        },
        size: {
            width: 2,
            height: 1,
        }
    }],
    commands: [],
} satisfies AodakePlugin;