
import { AnoriPlugin, OnCommandInputCallback, WidgetConfigurationScreenProps, WidgetDescriptor, WidgetRenderProps } from '@utils/user-data/types';
import './styles.scss';
import { Button } from '@components/Button';
import { useState } from 'react';
import { Input } from '@components/Input';
import { Select } from '@components/Select';
import { Icon } from '@components/Icon';
import { Tooltip } from '@components/Tooltip';
import { useSizeSettings } from '@utils/compact';
import { FloatingDelayGroup } from '@floating-ui/react';


const providersPretty = {
    'google': 'Google',
    'images': 'Google Images',
    'yt': 'YouTube',
    'bing': 'Bing',
    'duck': 'DuckDuckGo',
} as const;

const providersIcons = {
    'google': 'logos:google-icon',
    'images': 'logos:google-photos',
    'yt': 'logos:youtube-icon',
    'bing': 'logos:bing',
    'duck': 'logos:duckduckgo',
} as const;

type Provider = keyof typeof providersPretty;

const providers = Object.keys(providersPretty) as Provider[];

type WidgetConfig = {
    defaultProvider: Provider,
};

const generateSearchUrl = (provider: Provider, query: string) => {
    return {
        'google': `https://www.google.com/search?q=${encodeURIComponent(query)}`,
        'images': `https://www.google.com/search?q=${encodeURIComponent(query)}&tbm=isch`,
        'yt': `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`,
        'bing': `https://www.bing.com/search?q=${encodeURIComponent(query)}`,
        'duck': `https://duckduckgo.com/?q=${encodeURIComponent(query)}`,
    }[provider];
}


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
        const url = generateSearchUrl(activeProvider, query);
        window.location.href = url;
    };

    const [activeProvider, setProvider] = useState(config.defaultProvider);
    const [query, setQuery] = useState('');
    const { rem } = useSizeSettings();


    return (<div className='SearchWidget'>
        <div className="providers">
            <FloatingDelayGroup delay={200}>
                {providers.map(p => {
                    return (<Tooltip key={p} label={providersPretty[p]} placement='top'>
                        <Button
                            className='provider-button'
                            onClick={() => setProvider(p)}
                            active={p === activeProvider}
                        >
                            <Icon icon={providersIcons[p]} height={rem(1.5)} width={rem(1.5)} />
                        </Button>
                    </Tooltip>)
                })}
            </FloatingDelayGroup>
        </div>

        <div className="search-input-wrapper">
            <Input
                onKeyDown={e => e.key === 'Enter' ? doSearch() : null}
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder='Search...'
            />
            <Button withoutBorder onClick={doSearch}><Icon width={rem(1)} height={rem(1)} icon="ion:search" /></Button>
        </div>

    </div>)
};

const onCommandInput: OnCommandInputCallback = async (text: string) => {
    const tokens = text.split(' ');
    const command = tokens[0];
    const shouldFilterProviders = (providers as string[]).includes(command);
    const query = shouldFilterProviders ? tokens.slice(1).join(' ') : text;
    if (!query) return [];
    return providers.filter(p => shouldFilterProviders ? p === command : true).map(p => {
        const url = generateSearchUrl(p, query);

        return {
            icon: providersIcons[p],
            text: `Search ${providersPretty[p]} for «${query}»`,
            onSelected: () => window.location.href = url,
            key: p,
        }
    });
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
    onCommandInput,
    widgets: [
        widgetDescriptor,
    ],
    configurationScreen: null,
} satisfies AnoriPlugin;