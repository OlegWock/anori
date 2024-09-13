import { AnoriPlugin, OnCommandInputCallback, WidgetConfigurationScreenProps, WidgetDescriptor, WidgetRenderProps } from '@utils/user-data/types';
import './styles.scss';
import { Button } from '@components/Button';
import { useState, useEffect } from 'react';
import { Input } from '@components/Input';
import { Select } from '@components/Select';
import { Icon } from '@components/Icon';
import { Tooltip } from '@components/Tooltip';
import { useSizeSettings } from '@utils/compact';
import { FloatingDelayGroup } from '@floating-ui/react';
import { translate } from '@translations/index';
import { useTranslation } from 'react-i18next';
import browser from 'webextension-polyfill';

const providers = [
    { name: 'Google', url: 'https://www.google.com/search?q={query}' },
    { name: 'Google-Images', url: 'https://www.google.com/search?q={query}&tbm=isch' },
    { name: 'YouTube', url: 'https://www.youtube.com/results?search_query={query}' },
    { name: 'Bing', url: 'https://www.bing.com/search?q={query}' },
    { name: 'DuckDuckGo', url: 'https://duckduckgo.com/?q={query}' },
    { name: 'Ecosia', url: 'https://www.ecosia.org/search?q={query}' },
    { name: 'Kagi', url: 'https://kagi.com/search?q={query}' },
    { name: 'Brave', url: 'https://search.brave.com/search?q={query}' }
];

const providersIcons = {
    'Google': 'logos:google-icon',
    'Google-Images': 'logos:google-photos',
    'YouTube': 'logos:youtube-icon',
    'Bing': 'logos:bing',
    'DuckDuckGo': 'logos:duckduckgo',
    'Ecosia': 'twemoji:deciduous-tree',
    'Kagi': 'twemoji:dog-face',
    'Brave': 'logos:brave'
} as const;

type Provider = { name: string, url: string };

type WidgetConfig = {
    defaultProvider: Provider,
    visibleProviders: Provider[],
};

const generateSearchUrl = (provider: Provider, query: string) => {
    return provider.url.replace('{query}', encodeURIComponent(query));
};

const ConfigScreen = ({ currentConfig, saveConfiguration }: WidgetConfigurationScreenProps<WidgetConfig>) => {
    const [defaultProvider, setDefaultProvider] = useState<Provider>(
        currentConfig ? currentConfig.defaultProvider : providers[0]
    );
    const [visibleProviders, setVisibleProviders] = useState<Provider[]>(
        currentConfig?.visibleProviders || providers
    );
    const [customName, setCustomName] = useState('');
    const [customUrl, setCustomUrl] = useState('');
    const [customUrlPlaceholder] = useState('https://www.google.com/search?q={query}'); // Default text for URL input
    const { t } = useTranslation();

    // Update state when currentConfig changes
    useEffect(() => {
        if (currentConfig) {
            setDefaultProvider(currentConfig.defaultProvider);
            setVisibleProviders(currentConfig.visibleProviders);
        }
    }, [currentConfig]);

    const toggleProvider = (provider: Provider) => {
        setVisibleProviders((prev) => {
            const exists = prev.find(p => p.name === provider.name);
            return exists
                ? prev.filter((p) => p.name !== provider.name)
                : [...prev, provider];
        });
    };

    const addCustomProvider = () => {
        if (customName && customUrl) {
            const newProvider = { name: customName, url: customUrl };
            
            // Prevent adding a provider with the same name as an existing one
            setVisibleProviders((prev) => {
                const exists = prev.find(p => p.name === newProvider.name);
                return exists ? prev : [...prev, newProvider];
            });
            
            setCustomName('');
            setCustomUrl('');
            setDefaultProvider(newProvider); // Set the custom provider as the default
        }
    };

    const handleCustomUrlFocus = () => {
        if (customUrl === '') {
            setCustomUrl(customUrlPlaceholder); // Show placeholder text
        }
    };

    const handleCustomUrlBlur = () => {
        if (customUrl === customUrlPlaceholder) {
            setCustomUrl(''); // Clear input field if it's just the placeholder
        }
    };

    return (
        <div className='SearchWidget-config'>
            <div>
                <label>{t('Default Provider')}</label>
                <Select<Provider>
                    options={visibleProviders}
                    value={defaultProvider}
                    onChange={setDefaultProvider}
                    getOptionKey={o => o.name}
                    getOptionLabel={o => o.name}
                />
            </div>

            <div>
                <label>{t('Visible Providers')}</label>
                {providers.map((provider) => (
                    <div key={provider.name}>
                    <input
                        type="checkbox"
                        id={provider.name}
                        checked={visibleProviders.includes(provider)}  // Reflect current state in checkboxes
                        onChange={() => toggleProvider(provider)}
                    />
                        <label htmlFor={provider.name}>
                            {provider.name}
                        </label>
                    </div>
                ))}
            </div>

            <div>
                <label>{t('Add Custom Provider')}</label>
                <Input
                    value={customName}
                    onChange={e => setCustomName(e.target.value)}
                    placeholder={t('Provider Name')}
                />
                <Input
                    value={customUrl}
                    onChange={e => setCustomUrl(e.target.value)}
                    onFocus={handleCustomUrlFocus}
                    onBlur={handleCustomUrlBlur}
                    placeholder={customUrlPlaceholder} // Display the placeholder when empty
                />
                <Button onClick={addCustomProvider}>{t('Add')}</Button>
            </div>

            <Button
                className='save-config'
                onClick={() => saveConfiguration({ defaultProvider, visibleProviders })}
            >
                {t('save')}
            </Button>
        </div>
    );
};

const WidgetScreen = ({ config }: WidgetRenderProps<WidgetConfig>) => {
    const [activeProvider, setActiveProvider] = useState<Provider>(config.defaultProvider);
    const [query, setQuery] = useState('');
    const { rem, isCompact } = useSizeSettings();
    const { t } = useTranslation();

    const doSearch = (e: React.KeyboardEvent | React.MouseEvent) => {
        const url = generateSearchUrl(activeProvider, query);

        browser.runtime.sendMessage({ type: 'open-url', url, inNewTab: e.ctrlKey || e.metaKey });
    };

    return (
        <div className='SearchWidget'>
            <div className="providers">
                <FloatingDelayGroup delay={200}>
                    {config.visibleProviders.map(p => (
                        <Tooltip key={p.name} label={p.name} placement='top'>
                            <Button
                                className='provider-button'
                                onClick={() => setActiveProvider(p)}
                                active={p === activeProvider}
                            >
                                <Icon
                                    icon={providersIcons[p.name as keyof typeof providersIcons] || 'logos:generic-icon'}
                                    height={isCompact ? rem(1.25) : rem(1.5)}
                                    width={isCompact ? rem(1.25) : rem(1.5)}
                                />
                            </Button>
                        </Tooltip>
                    ))}
                </FloatingDelayGroup>
            </div>

            <div className="search-input-wrapper">
                <Input
                    onKeyDown={e => e.key === 'Enter' ? doSearch(e) : null}
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder={t('search')}
                />
                <Button withoutBorder onClick={(e) => doSearch(e)}>
                    <Icon width={rem(1)} height={rem(1)} icon="ion:search" />
                </Button>
            </div>
        </div>
    );
};

const onCommandInput: OnCommandInputCallback = async (text: string) => {
    const tokens = text.split(' ');
    const command = tokens[0];
    const shouldFilterProviders = providers.some(p => p.name.toLowerCase() === command.toLowerCase());
    const query = shouldFilterProviders ? tokens.slice(1).join(' ') : text;
    if (!query) return [];

    return providers
        .filter(p => shouldFilterProviders ? p.name.toLowerCase() === command.toLowerCase() : true)
        .map(p => {
            const url = generateSearchUrl(p, query);

            return {
                icon: providersIcons[p.name as keyof typeof providersIcons] || 'logos:generic-icon',
                text: translate('search-plugin.searchProviderForQ', { provider: p.name, query }),
                onSelected: () => window.location.href = url,
                key: p.name,
            };
        });
};

export const searchWidgetDescriptor = {
    id: 'search-widget',
    get name() {
        return translate('search-plugin.widgetName');
    },
    appearance: {
        resizable: false,
        size: {
            width: 4,
            height: 1,
        },
    },
    configurationScreen: ConfigScreen,
    mainScreen: WidgetScreen,
    mock: () => (
        <WidgetScreen
            config={{
                defaultProvider: providers[0],
                visibleProviders: [
                    ...providers,
                    { name: 'Custom Search Engine', url: 'https://example.com/search?q={query}' }
                ],
            }}
            instanceId='mock'
        />
    ),
} satisfies WidgetDescriptor<WidgetConfig>;

export const searchPlugin = {
    id: 'search-plugin',
    get name() {
        return translate('search-plugin.name');
    },
    onCommandInput,
    widgets: [
        searchWidgetDescriptor,
    ],
    configurationScreen: null,
} satisfies AnoriPlugin;
