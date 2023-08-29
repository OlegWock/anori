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
import { IS_TOUCH_DEVICE } from "@utils/device";
import { IconPicker } from "@components/IconPicker";
import { Icon } from "@components/Icon";
import { useSizeSettings } from "@utils/compact";
import { AnimatePresence } from "framer-motion";
import { WidgetExpandArea, WidgetExpandAreaRef } from "@components/WidgetExpandArea";
import { Checkbox } from "@components/Checkbox";
import { Link } from "@components/Link";
import { dnrPermissions, ensureDnrRules, plantWebRequestHandler } from "@plugins/shared/dnr";
import { Alert } from "@components/Alert";

// There is some problem with cookies in Iframe. When cookie set with SameSite=Lax (default value) or SameSite=Strict
// it's not available for JS (not sent at all?) if opened in iframe. Sites need to explicitly set SameSite=None to allow 
// those cookies to function

type IframePluginWidgetConfigType = {
    title: string,
    url: string,
    showLinkToPage: boolean,
};

type IframePluginExpandableWidgetConfigType = {
    title: string,
    icon: string,
    url: string,
    showLinkToPage: boolean,
};

const MainWidgetConfigScreen = ({ saveConfiguration, currentConfig }: WidgetConfigurationScreenProps<IframePluginWidgetConfigType>) => {
    const onConfirm = () => {

        saveConfiguration({ url, title, showLinkToPage });
    };

    const [title, setTitle] = useState(currentConfig?.title || '');
    const [url, setUrl] = useState(currentConfig?.url || '');
    const [showLinkToPage, setShowLinkToPage] = useState(currentConfig?.showLinkToPage ?? true);
    const { t } = useTranslation();

    return (<div className="IframeWidget-config">
        <Alert>
            {t('iframe-plugin.limitations')}
        </Alert>
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
        <div className="field">
            <Checkbox checked={showLinkToPage} onChange={setShowLinkToPage}>{t('iframe-plugin.showLink')}</Checkbox>
        </div>

        <Button className="save-config" onClick={onConfirm}>Save</Button>
    </div>);
};

const MainWidget = ({ config, instanceId }: WidgetRenderProps<IframePluginWidgetConfigType>) => {
    const [canRenderIframe, setCanRenderIframe] = useState(false);
    const { rem } = useSizeSettings();

    useEffect(() => {
        const main = async () => {
            setCanRenderIframe(false);
            await ensureDnrRules(config.url);
            setCanRenderIframe(true);
        };

        main();
    }, [config.url]);

    return (<div className="IframeWidget">
        {!!config.title && <div className="header">
            <h2>{config.title}</h2>
            {config.showLinkToPage && <div className="open-url-btn-wrapper">
                <Link className="open-url-btn" href={config.url}><Icon icon="ion:open-outline" height={rem(1.25)} width={rem(1.25)} /></Link>
            </div>}
        </div>}
        {(!config.title && config.showLinkToPage) && <div className="open-url-btn-wrapper absolute">
            <Link className="open-url-btn" href={config.url}><Icon icon="ion:open-outline" height={rem(1.25)} width={rem(1.25)} /></Link>
        </div>}
        {canRenderIframe && <iframe src={config.url} allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture; cross-origin-isolated" />}
    </div>);
};

const ExpandableWidgetConfigScreen = ({ saveConfiguration, currentConfig }: WidgetConfigurationScreenProps<IframePluginExpandableWidgetConfigType>) => {
    const onConfirm = () => {

        saveConfiguration({ url, title, icon, showLinkToPage });
    };

    const [title, setTitle] = useState(currentConfig?.title || '');
    const [icon, setIcon] = useState(currentConfig?.icon || 'ion:compass');
    const [url, setUrl] = useState(currentConfig?.url || '');
    const [showLinkToPage, setShowLinkToPage] = useState(currentConfig?.showLinkToPage ?? true);
    const { t } = useTranslation();
    const { rem } = useSizeSettings();
    const iconSearchRef = useRef<HTMLInputElement>(null);

    return (<div className="IframeWidget-config">
        <Alert>
            {t('iframe-plugin.limitations')}
        </Alert>

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

        <div className="field">
            <Checkbox checked={showLinkToPage} onChange={setShowLinkToPage}>{t('iframe-plugin.showLink')}</Checkbox>
        </div>

        <Button className="save-config" onClick={onConfirm}>Save</Button>
    </div>);
};

const ExpandableWidget = ({ config, instanceId }: WidgetRenderProps<IframePluginExpandableWidgetConfigType>) => {
    const [open, setOpen] = useState(false);
    const { rem } = useSizeSettings();
    const { t } = useTranslation();
    const normalizedUrl = useMemo(() => normalizeUrl(config.url), [config.url]);
    const host = useMemo(() => parseHost(normalizedUrl), [normalizedUrl]);
    const expandAreaRef = useRef<WidgetExpandAreaRef>(null);

    useEffect(() => {
        ensureDnrRules(config.url);
    }, [config.url]);

    return (<>
        <button className="ExpandableIframeWidget" onClick={() => open ? expandAreaRef.current?.focus(true) : setOpen(true)}>
            <div className="iframe-widget-content">
                <Icon icon={config.icon} width={rem(2.25)} height={rem(2.25)} />
                <div className="text">
                    <h2>{config.title}</h2>
                    <div className="host">{host}</div>
                </div>
            </div>
        </button>
        <AnimatePresence>
            {open && <WidgetExpandArea
                title={config.title}
                ref={expandAreaRef}
                size="max"
                onClose={() => setOpen(false)}
                withoutScroll
                className="ExpandableIframeWidget-expand-area"
                extraButtons={config.showLinkToPage && <Link className="open-url-btn" href={config.url}><Icon icon="ion:open-outline" height={rem(1.5)} width={rem(1.5)} /></Link>}
            >
                <iframe src={config.url} allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture; cross-origin-isolated" />
            </WidgetExpandArea>}
        </AnimatePresence>
    </>);
};


const widgetDescriptor = {
    id: 'iframe-widget',
    get name() {
        return translate('iframe-plugin.name');
    },
    configurationScreen: MainWidgetConfigScreen,
    mainScreen: (props: WidgetRenderProps<IframePluginWidgetConfigType>) => {
        return (<RequirePermissions
            hosts={[parseHost(props.config.url)]}
            permissions={dnrPermissions}
        >
            <MainWidget {...props} />
        </RequirePermissions>);
    },
    mock: () => {
        return (<MainWidget instanceId="mock" config={{ url: 'http://example.com/', title: '', showLinkToPage: true }} />)
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
            className="rp-paddings"
            permissions={dnrPermissions}
        >
            <ExpandableWidget {...props} />
        </RequirePermissions>);
    },
    mock: () => {
        const { t } = useTranslation();
        return (<ExpandableWidget instanceId="mock" config={{ url: 'http://example.com/', title: t('example'), icon: 'ion:compass', showLinkToPage: true }} />)
    },
    appearance: {
        size: {
            width: 1,
            height: 1,
        },
        withHoverAnimation: true,
        withoutPadding: true,
        resizable: false,
    }
} as const satisfies WidgetDescriptor<any>;

export const iframePlugin = {
    id: 'iframe-plugin',
    get name() {
        return translate('iframe-plugin.name');
    },
    widgets: [
        widgetDescriptor,
        widgetDescriptorExpandable,
    ],
    configurationScreen: null,
    onStart: () => {
        plantWebRequestHandler();
    }
} satisfies AnoriPlugin;