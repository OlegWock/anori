
import { AodakePlugin, WidgetConfigurationScreenProps, WidgetDescriptor, WidgetRenderProps } from '@utils/user-data/types';
import './styles.scss';
import { Button } from '@components/Button';
import { useState } from 'react';
import { Input } from '@components/Input';
import { Select } from '@components/Select';
import { Icon } from '@components/Icon';
import { Tooltip } from '@components/Tooltip';


const providersPretty = {
    'google': 'Google',
    'googleImages': 'Google Images',
    'youtube': 'Youtube',
    'bing': 'Bing',
    'duck': 'DuckDuckGo',
} as const;

const providersIcons = {
    'google': 'logos:google-icon',
    'googleImages': 'logos:google-photos',
    'youtube': 'logos:youtube-icon',
    'bing': 'logos:bing',
    'duck': 'logos:duckduckgo',
} as const;

type Provider = keyof typeof providersPretty;

const providers = Object.keys(providersPretty) as Provider[];

type WidgetConfig = {
    defaultProvider: Provider,
};


const ConfigScreen = ({ currentConfig, saveConfiguration }: WidgetConfigurationScreenProps<WidgetConfig>) => {
    const [defaultProvider, setDefaultProvider] = useState<Provider>(currentConfig ? currentConfig.defaultProvider : 'google');

    return (<div className='SearchWidget-config'>
        <div>
            <label>Default provider</label>
            <Select<Provider>
                options={providers}
                value={defaultProvider}
                onChange={setDefaultProvider}
                getOptionKey={o => o}
                getOptionLabel={o => providersPretty[o]}
            />
        </div>

        <Button className='save-config' onClick={() => saveConfiguration({ defaultProvider })}>Save</Button>
    </div>)
};

const WidgetScreen = ({ config }: WidgetRenderProps<WidgetConfig>) => {
    const doSearch = () => {
        const url = {
            'google': `https://www.google.com/search?q=${encodeURIComponent(query)}`,
            'googleImages': `https://www.google.com/search?q=${encodeURIComponent(query)}&tbm=isch`,
            'youtube': `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`,
            'bing': `https://www.bing.com/search?q=${encodeURIComponent(query)}`,
            'duck': `https://duckduckgo.com/?q=${encodeURIComponent(query)}`,
        }[activeProvider];
        window.location.href = url;
    };

    const [activeProvider, setProvider] = useState(config.defaultProvider);
    const [query, setQuery] = useState('');


    return (<div className='SearchWidget'>
        <div className="providers">
            {providers.map(p => {
                return (<Tooltip key={p} label={providersPretty[p]} placement='top'>
                    <Button
                        className='provider-button'
                        onClick={() => setProvider(p)}
                        active={p === activeProvider}
                    >
                        <Icon icon={providersIcons[p]} height={24} width={24} />
                    </Button>
                </Tooltip>)
            })}
        </div>

        <div className="search-input-wrapper">
            <Input
                onKeyDown={e => e.key === 'Enter' ? doSearch() : null}
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder='Search...'
            />
            <Button withoutBorder onClick={doSearch}><Icon icon="ion:search" /></Button>
        </div>

    </div>)
};

const widgetDescriptor = {
    id: 'search-widget',
    name: 'Search',
    size: {
        width: 4,
        height: 1,
    },
    configurationScreen: ConfigScreen,
    mainScreen: WidgetScreen,
    withAnimation: false,
    mock: () => (<WidgetScreen config={{
        defaultProvider: 'google',
    }} instanceId='mock' />),
} satisfies WidgetDescriptor<WidgetConfig>;

export const searchPlugin = {
    id: 'search-plugin',
    name: 'Internet search',
    widgets: [
        widgetDescriptor,
    ],
    configurationScreen: null,
} satisfies AodakePlugin;