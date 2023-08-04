import { Button } from "@components/Button";
import { AnoriPlugin, WidgetConfigurationScreenProps, WidgetRenderProps, WidgetDescriptor } from "@utils/user-data/types";
import './styles.scss';
import { translate } from "@translations/index";
import { useTranslation } from "react-i18next";
import { useEffect, useMemo, useRef, useState } from "react";
import { Input } from "@components/Input";
import { Popover } from "@components/Popover";
import { PickBookmark } from "@components/PickBookmark";
import { RequirePermissions } from "@components/RequirePermissions";
import { normalizeUrl, parseHost } from "@utils/misc";
import browser from 'webextension-polyfill';
import { createOnMessageHandlers } from "@utils/plugin";
import { IS_TOUCH_DEVICE } from "@utils/device";
import { IconPicker } from "@components/IconPicker";
import { Icon } from "@components/Icon";
import { useSizeSettings } from "@utils/compact";
import { AnimatePresence } from "framer-motion";
import { WidgetExpandArea } from "@components/WidgetExpandArea";


type IframePluginWidgetConfigType = {
    title: string,
    url: string,
};

type IframePluginExpandableWidgetConfigType = {
    title: string,
    icon: string,
    url: string,
};

const ensureDnrRule = async (url: string) => {
    if (!browser.declarativeNetRequest) {
        console.log('declarativeNetRequest API not available')
        return;
    }
    const currentRules = await browser.declarativeNetRequest.getDynamicRules();
    const host = parseHost(url);

    const alreadyRegistered = currentRules.find(r => r.condition.requestDomains?.includes(host));
    if (alreadyRegistered) return;

    const maxId = Math.max(...currentRules.map(r => r.id));
    await browser.declarativeNetRequest.updateDynamicRules({
        addRules: [{
            id: Math.max(maxId + 1, 1),
            condition: {
                requestDomains: [host],
                resourceTypes: ['sub_frame'],
            },
            action: {
                type: 'modifyHeaders',
                responseHeaders: [
                    {
                        "header": "X-Frame-Options",
                        "operation": "remove"
                    },
                    {
                        "header": "Content-Security-Policy",
                        "operation": "remove"
                    }
                ],
            }
        }]
    });
};

const MainWidgetConfigScreen = ({ saveConfiguration, currentConfig }: WidgetConfigurationScreenProps<IframePluginWidgetConfigType>) => {
    const onConfirm = () => {

        saveConfiguration({ url, title });
    };

    const [title, setTitle] = useState(currentConfig?.title || '');
    const [url, setUrl] = useState(currentConfig?.url || '');
    const { t } = useTranslation();

    return (<div className="IframeWidget-config">
        <div className="field">
            <label>{t('title')} ({t('canBeEmpty')})</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="field">
            <label>{t('url')}:</label>
            <div className="url-import-wrapper">
                <Input value={url} onChange={(e) => setUrl(e.target.value)} />
                {/* Bookmarks API not supported in Safari at all */}
                {X_BROWSER !== 'safari' && <Popover
                    component={PickBookmark}
                    additionalData={{
                        onSelected: (title, url) => {
                            console.log('Selected bookmark', title, url);
                            setUrl(url);
                        },
                    }}
                >
                    <Button>{t('import')}</Button>
                </Popover>}
            </div>
        </div>

        <Button className="save-config" onClick={onConfirm}>Save</Button>
    </div>);
};

const MainWidget = ({ config, instanceId }: WidgetRenderProps<IframePluginWidgetConfigType>) => {
    const [canRenderIframe, setCanRenderIframe] = useState(false);

    useEffect(() => {
        const main = async () => {
            console.log('Iframe effect');
            setCanRenderIframe(false);
            await sendMessage('ensureDnrRule', { url: config.url });
            console.log('After message');
            setCanRenderIframe(true);
        };

        main();
    }, [config.url]);

    return (<div className="IframeWidget">
        {!!config.title && <h2>{config.title}</h2>}
        {canRenderIframe && <iframe src={config.url} />}
    </div>);
};

const ExpandableWidgetConfigScreen = ({ saveConfiguration, currentConfig }: WidgetConfigurationScreenProps<IframePluginExpandableWidgetConfigType>) => {
    const onConfirm = () => {

        saveConfiguration({ url, title, icon });
    };

    const [title, setTitle] = useState(currentConfig?.title || '');
    const [icon, setIcon] = useState(currentConfig?.icon || 'ion:compass');
    const [url, setUrl] = useState(currentConfig?.url || '');
    const { t } = useTranslation();
    const { rem } = useSizeSettings();
    const iconSearchRef = useRef<HTMLInputElement>(null);

    return (<div className="IframeWidget-config">
        <div className="field">
            <label>{t('icon')}:</label>
            <Popover
                component={IconPicker}
                initialFocus={IS_TOUCH_DEVICE ? -1 : iconSearchRef}
                additionalData={{
                    onSelected: setIcon,
                    inputRef: iconSearchRef,
                }}
            >
                <Button className="icon-picker-trigger"><Icon icon={icon} width={rem(3)} /></Button>
            </Popover>
        </div>
        <div className="field">
            <label>{t('title')}</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="field">
            <label>{t('url')}:</label>
            <div className="url-import-wrapper">
                <Input value={url} onChange={(e) => setUrl(e.target.value)} />
                {/* Bookmarks API not supported in Safari at all */}
                {X_BROWSER !== 'safari' && <Popover
                    component={PickBookmark}
                    additionalData={{
                        onSelected: (title, url) => {
                            console.log('Selected bookmark', title, url);
                            setUrl(url);
                        },
                    }}
                >
                    <Button>{t('import')}</Button>
                </Popover>}
            </div>
        </div>

        <Button className="save-config" onClick={onConfirm}>Save</Button>
    </div>);
};

const ExpandableWidget = ({ config, instanceId }: WidgetRenderProps<IframePluginExpandableWidgetConfigType>) => {
    const [open, setOpen] = useState(false);
    const { rem } = useSizeSettings();
    const normalizedUrl = useMemo(() => normalizeUrl(config.url), [config.url]);
    const host = useMemo(() => parseHost(normalizedUrl), [normalizedUrl]);

    useEffect(() => {
        sendMessage('ensureDnrRule', { url: config.url });
    }, [config.url]);

    return (<>
        <button className="ExpandableIframeWidget" onClick={() => setOpen(true)}>
            <Icon icon={config.icon} width={rem(2.25)} height={rem(2.25)} />
            <div className="text">
                <h2>{config.title}</h2>
                <div className="host">{host}</div>
            </div>
        </button>
        <AnimatePresence>
            {open && <WidgetExpandArea
                size="max"
                closable={false}
                onClose={() => setOpen(false)}
                className="ExpandableIframeWidget-expand-area"
            >
                <iframe src={config.url} />
            </WidgetExpandArea>}
        </AnimatePresence>
    </>);
};

const { handlers, sendMessage } = createOnMessageHandlers<{
    ensureDnrRule: { args: { url: string }, result: void },
}>('iframe-plugin', {
    'ensureDnrRule': async (args, senderTabId) => ensureDnrRule(args.url),
});


const widgetDescriptor = {
    id: 'iframe-widget',
    get name() {
        return translate('iframe-plugin.name');
    },
    configurationScreen: MainWidgetConfigScreen,
    mainScreen: (props: WidgetRenderProps<IframePluginWidgetConfigType>) => {
        return (<RequirePermissions
            hosts={[parseHost(props.config.url)]}
            permissions={["declarativeNetRequestWithHostAccess"]}
        >
            <MainWidget {...props} />
        </RequirePermissions>);
    },
    mock: () => {
        return (<MainWidget instanceId="mock" config={{ url: 'http://example.com/', title: '' }} />)
    },
    appearance: {
        size: {
            width: 2,
            height: 2,
        },
        resizable: {
            min: { width: 2, height: 2 }
        },
    }
} as const satisfies WidgetDescriptor<any>;

const widgetDescriptorExpandable = {
    id: 'iframe-widget-expandable',
    get name() {
        return translate('iframe-plugin.expandWidgetName');
    },
    configurationScreen: ExpandableWidgetConfigScreen,
    mainScreen: (props: WidgetRenderProps<IframePluginExpandableWidgetConfigType>) => {
        return (<RequirePermissions
            compact
            hosts={[parseHost(props.config.url)]}
            permissions={["declarativeNetRequestWithHostAccess"]}
        >
            <ExpandableWidget {...props} />
        </RequirePermissions>);
    },
    mock: () => {
        const { t } = useTranslation();
        return (<ExpandableWidget instanceId="mock" config={{ url: 'http://example.com/', title: t('example'), icon: 'ion:compass' }} />)
    },
    appearance: {
        size: {
            width: 1,
            height: 1,
        },
        withHoverAnimation: true,
        resizable: false,
    }
} as const satisfies WidgetDescriptor<any>;

export const iframePlugin = {
    id: 'iframe-plugin',
    get name() {
        return translate('iframe-plugin.name');
    },
    onMessage: handlers,
    widgets: [
        widgetDescriptor,
        widgetDescriptorExpandable,
    ],
    configurationScreen: null,
} satisfies AnoriPlugin;