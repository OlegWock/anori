import { Button } from "@components/Button";
import { Input } from "@components/Input";
import { AodakePlugin, WidgetConfigurationProps, WidgetRenderProps } from "@utils/user-data/types";
import { useState } from "react";
import './styles.scss';
import { Popover } from "@components/Popover";
import { IconPicker } from "@components/IconPicker";
import { Icon } from "@components/Icon";
import { useMemo } from "react";

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

    return (<div className="ExampleWidget-config">
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

const MainScreen = ({ config, isMock }: WidgetRenderProps<ExampleConfigType> & { isMock?: boolean }) => {
    console.log('Render main screen', config);
    const host = useMemo(() => {
        try {
            return new URL(config.url).hostname;
        } catch (err) {
            return `Couldn't parse hostname`
        }
    }, [config.url])
    return (<a className="ExampleWidget" href={isMock ? undefined : config.url}>
        <div className="text">
            <h3>{config.title}</h3>
            <div className="host">{host}</div>
        </div>
        <Icon icon={config.icon} width={92} height={92} />
    </a>);
};


const Mock = () => {
    return (<MainScreen isMock config={{
        url: 'http://example.com',
        title: 'Site name',
        icon: 'ion:dice'
    }} />)
};

export const examplePlugin = {
    id: 'example-plugin',
    name: 'Just example plugin',
    widgets: [{
        id: 'example-widget',
        name: 'Example widget',
        configurationScreen: ConfigScreen,
        mainScreen: MainScreen,
        mock: Mock,
    }],
    commands: [],
} satisfies AodakePlugin;