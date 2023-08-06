import { Button } from "@components/Button";
import { Input } from "@components/Input";
import { AnoriPlugin, WidgetConfigurationScreenProps, OnCommandInputCallback, WidgetRenderProps, WidgetDescriptor } from "@utils/user-data/types";
import { MouseEvent, MouseEventHandler, useRef, useState } from "react";
import './styles.scss';
import { Popover } from "@components/Popover";
import { IconPicker } from "@components/IconPicker";
import { Icon } from "@components/Icon";
import { useMemo } from "react";
import clsx from "clsx";
import { createOnMessageHandlers, getAllWidgetsByPlugin, useWidgetMetadata } from "@utils/plugin";
import { guid, normalizeUrl, parseHost } from "@utils/misc";
import { useLinkNavigationState, usePrevious } from "@utils/hooks";
import { useSizeSettings } from "@utils/compact";
import browser from 'webextension-polyfill';
import { AnimatePresence, m } from "framer-motion";
import { useTranslation } from "react-i18next";
import { translate } from "@translations/index";
import { usePermissionsQuery } from "@utils/permissions";
import { listItemAnimation } from "@components/animations";
import { isChromeLike } from "@utils/browser";
import { isMacLike } from "@utils/shortcuts";
import { IS_TOUCH_DEVICE } from "@utils/device";
import { CheckboxWithPermission } from "@components/CheckboxWithPermission";
import { PickBookmark } from "@components/PickBookmark";
import { Link } from "@components/Link";
import { WidgetExpandArea } from "@components/WidgetExpandArea";
import { RequirePermissions } from "@components/RequirePermissions";
import { ensureDnrRule } from "@plugins/shared/dnr";

type BookmarkWidgetConfigType = {
    url: string,
    title: string,
    icon: string,
};

type BookmarkGroupWidgetConfigType = {
    title: string,
    icon: string,
    openInTabGroup: boolean,
    urls: string[],
};

type BookmarksMessageHandlers = {
    openGroup: {
        args: {
            urls: string[],
            openInTabGroup: boolean,
            title: string,
            closeCurrentTab: boolean,
        },
        result: void,
    },
    ensureDnrRule: {
        args: { url: string },
        result: void
    },
};


const BookmarGroupkWidgetConfigScreen = ({ saveConfiguration, currentConfig }: WidgetConfigurationScreenProps<BookmarkGroupWidgetConfigType>) => {
    const onConfirm = () => {
        const cleanedUrls = urls.map(u => u.url).filter(u => !!u);
        if (!title || urls.length === 0) return;

        saveConfiguration({ title, icon, urls: cleanedUrls, openInTabGroup });
    };

    const hasTabGroupsPermission = usePermissionsQuery({ permissions: ["tabGroups"] });
    const [title, setTitle] = useState(currentConfig?.title ?? '');
    const [urls, setUrls] = useState<{ id: string, url: string }[]>(() => {
        return currentConfig?.urls ? currentConfig.urls.map(url => ({ id: guid(), url })) : [{ id: guid(), url: '' }];
    });
    const [icon, setIcon] = useState(currentConfig?.icon ?? 'ion:dice');
    const [openInTabGroup, setOpenInTabGroup] = useState<boolean>(currentConfig?.openInTabGroup ?? (X_BROWSER === 'chrome' && hasTabGroupsPermission));
    const { rem } = useSizeSettings();
    const iconSearchRef = useRef<HTMLInputElement>(null);
    const { t } = useTranslation();

    return (
        <m.div className="BookmarkWidget-config">
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
                <label>{t('title')}:</label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="field">
                <label>{t('urls')}:</label>
                <div className="urls">
                    <AnimatePresence initial={false}>
                        {urls.map(({ id, url }, ind) => {
                            return (<m.div
                                className="url-import-wrapper"
                                layout
                                key={id}
                                {...listItemAnimation}
                            >
                                <Input value={url} onValueChange={(newUrl) => setUrls(p => {
                                    const copy = [...p];
                                    copy[ind].url = newUrl;
                                    return copy;
                                })} />
                                {/* Bookmarks API not supported in Safari at all */}
                                {X_BROWSER !== 'safari' && <Popover
                                    component={PickBookmark}
                                    additionalData={{
                                        onSelected: (title, url) => {
                                            console.log('Selected bookmark', title, url);
                                            setUrls(p => {
                                                const copy = [...p];
                                                copy[ind].url = url;
                                                return copy;
                                            })
                                        },
                                    }}
                                >
                                    <Button>{t('import')}</Button>
                                </Popover>}
                                <Button onClick={() => setUrls(p => p.filter((u, i) => i !== ind))}><Icon icon='ion:close' height={22} /></Button>
                            </m.div>);
                        })}
                    </AnimatePresence>
                </div>
            </div>

            <m.div layout className="add-button-wrapper">
                <Button className="add-button" onClick={() => setUrls((p) => [...p, { id: guid(), url: '' }])}>{t('add')}</Button>
            </m.div>
            {X_BROWSER === 'chrome' && <m.div className="field" layout="position">
                <CheckboxWithPermission permissions={["tabGroups"]} checked={openInTabGroup} onChange={setOpenInTabGroup}>
                    {t('bookmark-plugin.openInGroup')}
                </CheckboxWithPermission>
            </m.div>}

            <m.div layout className="save-config">
                <Button onClick={onConfirm}>{t('save')}</Button>
            </m.div>
        </m.div>
    );
};

const BookmarkGroupWidget = ({ config, isMock }: WidgetRenderProps<BookmarkGroupWidgetConfigType> & { isMock?: boolean }) => {
    const openGroup: MouseEventHandler<HTMLAnchorElement> = (e) => {
        e.preventDefault();
        onLinkClick(e);
        const shouldKeepCurrentTab = e.ctrlKey || (isMacLike && e.metaKey)
        sendMessage('openGroup', {
            urls: config.urls.map(u => normalizeUrl(u)),
            openInTabGroup: config.openInTabGroup,
            closeCurrentTab: !shouldKeepCurrentTab,
            title: config.title,
        });
    };
    const { rem } = useSizeSettings();
    const { onLinkClick, isNavigating } = useLinkNavigationState();
    const { t } = useTranslation();
    const { size: { width } } = useWidgetMetadata();
    const size = width === 1 ? 's' : 'm';

    return (<a className={clsx(['BookmarkWidget', `size-${size}`])} href="#" onClick={openGroup}>
        <div className="bookmark-content">
            <div className="text">
                <h2>{config.title}</h2>
                <div className="host">{t('bookmark-plugin.group')}</div>
            </div>
            {isNavigating
                ? (<Icon className="loading" icon="fluent:spinner-ios-20-regular" width={size === 'm' ? rem(5.75) : rem(2.25)} height={size === 'm' ? rem(5.75) : rem(2.25)} />)
                : (<Icon icon={config.icon} width={size === 'm' ? rem(5.75) : rem(2.25)} height={size === 'm' ? rem(5.75) : rem(2.25)} />)
            }
        </div>
    </a>);
};

const BookmarkWidgetConfigScreen = ({ saveConfiguration, currentConfig }: WidgetConfigurationScreenProps<BookmarkWidgetConfigType>) => {
    const onConfirm = () => {
        if (!title || !url) return;

        saveConfiguration({ title, url, icon });
    };
    const [title, setTitle] = useState(currentConfig?.title || '');
    const [url, setUrl] = useState(currentConfig?.url || '');
    const [icon, setIcon] = useState(currentConfig?.icon || 'ion:dice');
    const { rem } = useSizeSettings();
    const iconSearchRef = useRef<HTMLInputElement>(null);
    const { t } = useTranslation();

    return (<div className="BookmarkWidget-config">
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
            <label>{t('title')}:</label>
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
                            setTitle(title);
                            setUrl(url);
                        },
                    }}
                >
                    <Button>{t('import')}</Button>
                </Popover>}
            </div>
        </div>

        <Button className="save-config" onClick={onConfirm}>{t('save')}</Button>

    </div>);
};

const BookmarkWidget = ({ config, isMock }: WidgetRenderProps<BookmarkWidgetConfigType> & { isMock?: boolean }) => {
    const openIframe = (e: MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setShowExpandArea(true);
        if (hasDnrPermissions && !showIframe) {
            sendMessage('ensureDnrRule', { url: normalizedUrl })
                        .then(() => setShowIframe(true))
        }
    };

    const closeExpand = () => {
        setShowExpandArea(false);
    }


    const normalizedUrl = useMemo(() => normalizeUrl(config.url), [config.url]);
    const host = useMemo(() => parseHost(normalizedUrl), [normalizedUrl]);
    const { rem } = useSizeSettings();
    const { size: { width } } = useWidgetMetadata();
    const size = width === 1 ? 's' : 'm';
    const { onLinkClick, isNavigating } = useLinkNavigationState();
    const [showExpandArea, setShowExpandArea] = useState(false);
    const [showIframe, setShowIframe] = useState(false);
    const hasDnrPermissions = usePermissionsQuery({
        hosts: [parseHost(config.url)],
        permissions: ["declarativeNetRequestWithHostAccess", "browsingData"],
    });
    const prevUrl = usePrevious(config.url);
    if (prevUrl && prevUrl !== config.url) {
        setShowIframe(false);
    }

    return (<>
        <Link className={clsx(['BookmarkWidget', `size-${size}`])} href={isMock ? undefined : normalizedUrl} onClick={onLinkClick}>
            <div className="bookmark-content">
                <div className="text">
                    <h2>{config.title}</h2>
                    <div className="host">{host}</div>
                </div>
                {isNavigating
                    ? (<Icon className="loading" icon="fluent:spinner-ios-20-regular" width={size === 'm' ? rem(5.75) : rem(2.25)} height={size === 'm' ? rem(5.75) : rem(2.25)} />)
                    : (<Icon icon={config.icon} width={size === 'm' ? rem(5.75) : rem(2.25)} height={size === 'm' ? rem(5.75) : rem(2.25)} />)
                }
            </div>
            <button onClick={openIframe} className="open-in-iframe">
                <div>
                    <Icon icon="ion:expand" />
                </div>
            </button>
        </Link>
        <AnimatePresence>
            {showExpandArea && <WidgetExpandArea onClose={closeExpand} size="max" className="BookmarkWidget-expand">
                <RequirePermissions hosts={[parseHost(config.url)]} permissions={["declarativeNetRequestWithHostAccess", "browsingData"]} onGrant={() => {
                    sendMessage('ensureDnrRule', { url: config.url })
                        .then(() => setShowIframe(true))
                }}>
                    {showIframe && <iframe src={config.url} />}
                </RequirePermissions>
            </WidgetExpandArea>}
        </AnimatePresence>
    </>);
};

const onCommandInput: OnCommandInputCallback = async (text: string) => {
    const q = text.toLowerCase();
    const widgets = await getAllWidgetsByPlugin(bookmarkPlugin);
    return widgets.filter(widget => {
        const w = widget;
        const inUrl = ('url' in w.configutation && w.configutation.url.toLowerCase().includes(q)) || ('urls' in w.configutation && w.configutation.urls.join('').toLowerCase().includes(q));
        const inTitle = w.configutation.title.toLowerCase().includes(q);
        const inIcon = w.configutation.icon.toLowerCase().includes(q);

        return inUrl || inTitle || inIcon;
    }).map(w => {
        if ('url' in w.configutation) {
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
        } else {
            const { urls, title, icon, openInTabGroup } = w.configutation;
            return {
                icon,
                text: title,
                hint: translate('bookmark-plugin.group'),
                key: w.instanceId,
                onSelected: () => {
                    sendMessage('openGroup', {
                        urls,
                        title,
                        openInTabGroup,
                        closeCurrentTab: true,
                    });
                }
            };
        }
    });
};

export const bookmarkWidgetDescriptor = {
    id: 'bookmark',
    get name() {
        return translate('bookmark-plugin.widgetName')
    },
    configurationScreen: BookmarkWidgetConfigScreen,
    mainScreen: ({ config, instanceId }: WidgetRenderProps<BookmarkWidgetConfigType>) => {
        return <BookmarkWidget instanceId={instanceId} config={config} isMock={false} />
    },
    mock: () => {
        const { t } = useTranslation();
        return (<BookmarkWidget instanceId="" isMock config={{
            url: 'http://example.com',
            title: t('example'),
            icon: 'ion:dice',
        }} />)
    },
    appearance: {
        size: {
            width: 1,
            height: 1,
        },
        resizable: {
            min: { width: 1, height: 1 },
            max: { width: 2, height: 1 },
        },
        withHoverAnimation: true,
        withoutPadding: true,
    }
} as const satisfies WidgetDescriptor<any>;


export const bookmarkGroupWidgetDescriptor = {
    id: 'bookmark-group',
    get name() {
        return translate('bookmark-plugin.groupWidgetName')
    },
    configurationScreen: BookmarGroupkWidgetConfigScreen,
    mainScreen: ({ config, instanceId }: WidgetRenderProps<BookmarkGroupWidgetConfigType>) => {
        return <BookmarkGroupWidget instanceId={instanceId} config={config} isMock={false} />
    },
    mock: () => {
        const { t } = useTranslation();
        return (<BookmarkGroupWidget instanceId="" isMock config={{
            urls: ['http://example.com'],
            openInTabGroup: false,
            title: t('example'),
            icon: 'ion:cloud',
        }} />)
    },
    appearance: {
        size: {
            width: 1,
            height: 1,
        },
        resizable: {
            min: { width: 1, height: 1 },
            max: { width: 2, height: 1 },
        },
        withHoverAnimation: true,
        withoutPadding: true,
    }
} as const satisfies WidgetDescriptor<any>;


const { handlers, sendMessage } = createOnMessageHandlers<BookmarksMessageHandlers>('bookmark-plugin', {
    'openGroup': async (args, senderTabId) => {
        const tabs = await Promise.all(args.urls.map((url, i) => {
            return browser.tabs.create({
                url,
                active: i === 0,
            });
        }));
        if (senderTabId !== undefined && args.closeCurrentTab) browser.tabs.remove(senderTabId);
        if (args.openInTabGroup && isChromeLike(browser)) {
            const groupId = await browser.tabs.group({
                tabIds: tabs.map(t => t.id!),
            });

            await browser.tabGroups.update(groupId, { collapsed: false, title: args.title });
        }
    },
    'ensureDnrRule': async (args, senderTabId) => ensureDnrRule(args.url, senderTabId!),
});

export const bookmarkPlugin: AnoriPlugin<{}, BookmarkWidgetConfigType | BookmarkGroupWidgetConfigType> = {
    id: 'bookmark-plugin',
    get name() {
        return translate('bookmark-plugin.name')
    },
    widgets: [
        bookmarkWidgetDescriptor,
        bookmarkGroupWidgetDescriptor
    ],
    onCommandInput,
    configurationScreen: null,
    onMessage: handlers,
};

