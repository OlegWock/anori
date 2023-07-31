import { Button } from "@components/Button";
import { Input } from "@components/Input";
import { AnoriPlugin, WidgetConfigurationScreenProps, OnCommandInputCallback, WidgetRenderProps } from "@utils/user-data/types";
import { MouseEventHandler, useEffect, useRef, useState } from "react";
import './styles.scss';
import { Popover, PopoverRenderProps } from "@components/Popover";
import { IconPicker } from "@components/IconPicker";
import { Favicon, Icon } from "@components/Icon";
import { useMemo } from "react";
import clsx from "clsx";
import { createOnMessageHandlers, getAllWidgetsByPlugin } from "@utils/plugin";
import { guid, parseHost } from "@utils/misc";
import { useLinkNavigationState } from "@utils/hooks";
import { useSizeSettings } from "@utils/compact";
import { RequirePermissions } from "@components/RequirePermissions";
import browser from 'webextension-polyfill';
import { ScrollArea } from "@components/ScrollArea";
import { AnimatePresence, m } from "framer-motion";
import { useTranslation } from "react-i18next";
import { translate } from "@translations/index";
import { Checkbox } from "@components/Checkbox";
import { useAtomValue } from "jotai";
import { availablePermissionsAtom } from "@utils/permissions";
import { listItemAnimation } from "@components/animations";
import { isChromeLike } from "@utils/browser";
import { isMacLike } from "@utils/shortcuts";
import { IS_TOUCH_DEVICE } from "@utils/device";

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

type PickBookmarkProps = {
    onSelected: (title: string, url: string) => void,
};

type BrowserBookmark = {
    id: string,
    title: string,
    url: string,
    dateAdded: number,
};

type BookmarksMessageHandlers = {
    'openGroup': {
        args: {
            urls: string[],
            openInTabGroup: boolean,
            title: string,
            closeCurrentTab: boolean,
        },
        result: void,
    },
};

const normalizeUrl = (url: string) => {
    if (!url.includes('://')) {
        return 'https://' + url;
    }

    return url;
};

const _PickBookmark = ({ data: { onSelected }, close }: PopoverRenderProps<PickBookmarkProps>) => {
    const [bookmarks, setBookmarks] = useState<BrowserBookmark[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const { t } = useTranslation();

    useEffect(() => {
        const walkNode = (node: browser.Bookmarks.BookmarkTreeNode): BrowserBookmark[] => {
            if (node.children) {
                const res = node.children.map(n => walkNode(n));
                return res.flat();
            } else {
                return [{
                    id: node.id,
                    title: node.title,
                    url: node.url!,
                    dateAdded: node.dateAdded || 0,
                }];
            }
        };

        const main = async () => {
            const nodes = await browser.bookmarks.getTree();
            const bookmarks = nodes.flatMap(n => walkNode(n));
            setBookmarks(bookmarks);
        }

        main();
    }, []);

    const { rem } = useSizeSettings();

    const filteredBookmarks = bookmarks.filter(({ title, url }) => {
        const q = searchQuery.toLowerCase();
        return title.toLowerCase().includes(q) || url.toLowerCase().includes(q);
    });

    return (<div className="PickBookmark">
        <Input value={searchQuery} onValueChange={setSearchQuery} placeholder={t('bookmark-plugin.searchBookmarks')} />
        <ScrollArea>
            {filteredBookmarks.map(bk => {
                return (<m.div
                    key={bk.id}
                    className='bookmark'
                    onClick={() => {
                        onSelected(bk.title, bk.url)
                        close();
                    }}
                >
                    <Favicon url={bk.url} height={rem(1)} />
                    <div className="title">
                        {bk.title || bk.url}
                    </div>
                </m.div>);
            })}
            {filteredBookmarks.length === 0 && <div className="no-results">
                {t('noResults')}
            </div>}
        </ScrollArea>
    </div>);
};

const PickBookmark = (props: PopoverRenderProps<PickBookmarkProps>) => {
    return (<RequirePermissions permissions={["bookmarks", "favicon"]} >
        <_PickBookmark {...props} />
    </RequirePermissions >);
};

const BookmarGroupkWidgetConfigScreen = ({ saveConfiguration, currentConfig }: WidgetConfigurationScreenProps<BookmarkGroupWidgetConfigType>) => {
    const onConfirm = () => {
        const cleanedUrls = urls.map(u => u.url).filter(u => !!u);
        if (!title || urls.length === 0) return;

        saveConfiguration({ title, icon, urls: cleanedUrls, openInTabGroup });
    };
    const currentPermissions = useAtomValue(availablePermissionsAtom);
    const [title, setTitle] = useState(currentConfig?.title ?? '');
    const [urls, setUrls] = useState<{ id: string, url: string }[]>(() => {
        return currentConfig?.urls ? currentConfig.urls.map(url => ({ id: guid(), url })) : [{ id: guid(), url: '' }];
    });
    const [icon, setIcon] = useState(currentConfig?.icon ?? 'ion:dice');
    const [openInTabGroup, setOpenInTabGroup] = useState<boolean>(currentConfig?.openInTabGroup ?? (X_BROWSER === 'chrome' && !!currentPermissions?.permissions.includes('tabGroups')));
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
                {currentPermissions?.permissions.includes('tabGroups') && <Checkbox checked={openInTabGroup} onChange={setOpenInTabGroup}>
                    {t('bookmark-plugin.openInGroup')}
                </Checkbox>}
                {!currentPermissions?.permissions.includes('tabGroups') && <Popover trigger="hover" component={({ close }) => <RequirePermissions permissions={["tabGroups"]} onGrant={() => close()} />}>
                    <Checkbox disabled checked={openInTabGroup} onChange={setOpenInTabGroup}>
                        {t('bookmark-plugin.openInGroup')}
                    </Checkbox>
                </Popover>}
            </m.div>}

            <m.div layout className="save-config">
                <Button onClick={onConfirm}>{t('save')}</Button>
            </m.div>
        </m.div>
    );
};

const BookmarkGroupWidget = ({ config, isMock, size }: WidgetRenderProps<BookmarkGroupWidgetConfigType> & { isMock?: boolean, size: 's' | 'm' }) => {
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

    return (<a className={clsx(['BookmarkWidget', `size-${size}`])} href="#" onClick={openGroup} >
        <div className="text">
            <h2>{config.title}</h2>
            <div className="host">{t('bookmark-plugin.group')}</div>
        </div>
        {isNavigating
            ? (<Icon className="loading" icon="fluent:spinner-ios-20-regular" width={size === 'm' ? rem(5.75) : rem(2.25)} height={size === 'm' ? rem(5.75) : rem(2.25)} />)
            : (<Icon icon={config.icon} width={size === 'm' ? rem(5.75) : rem(2.25)} height={size === 'm' ? rem(5.75) : rem(2.25)} />)
        }
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

const BookmarkWidget = ({ config, isMock, size }: WidgetRenderProps<BookmarkWidgetConfigType> & { isMock?: boolean, size: 's' | 'm' }) => {
    const normalizedUrl = useMemo(() => normalizeUrl(config.url), [config.url]);
    const host = useMemo(() => parseHost(normalizedUrl), [normalizedUrl]);
    const { rem } = useSizeSettings();
    const { onLinkClick, isNavigating } = useLinkNavigationState();

    return (<a className={clsx(['BookmarkWidget', `size-${size}`])} href={isMock ? undefined : normalizedUrl} onClick={onLinkClick} >
        <div className="text">
            <h2>{config.title}</h2>
            <div className="host">{host}</div>
        </div>
        {isNavigating
            ? (<Icon className="loading" icon="fluent:spinner-ios-20-regular" width={size === 'm' ? rem(5.75) : rem(2.25)} height={size === 'm' ? rem(5.75) : rem(2.25)} />)
            : (<Icon icon={config.icon} width={size === 'm' ? rem(5.75) : rem(2.25)} height={size === 'm' ? rem(5.75) : rem(2.25)} />)
        }
    </a>);
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

export const bookmarkWidgetSizeSDescriptor = {
    id: 'bookmark-s',
    get name() {
        return translate('bookmark-plugin.widgetSizeSName')
    },
    configurationScreen: BookmarkWidgetConfigScreen,
    withAnimation: true,
    mainScreen: ({ config, instanceId }: WidgetRenderProps<BookmarkWidgetConfigType>) => {
        return <BookmarkWidget instanceId={instanceId} config={config} isMock={false} size="s" />
    },
    mock: () => {
        const { t } = useTranslation();
        return (<BookmarkWidget instanceId="" size="s" isMock config={{
            url: 'http://example.com',
            title: t('example'),
            icon: 'ion:dice',
        }} />)
    },
    size: {
        width: 1,
        height: 1,
    }
} as const;

export const bookmarkWidgetSizeMDescriptor = {
    id: 'bookmark-m',
    get name() {
        return translate('bookmark-plugin.widgetSizeMName')
    },
    configurationScreen: BookmarkWidgetConfigScreen,
    withAnimation: true,
    mainScreen: ({ config, instanceId }: WidgetRenderProps<BookmarkWidgetConfigType>) => {
        return <BookmarkWidget instanceId={instanceId} config={config} isMock={false} size="m" />
    },
    mock: () => {
        const { t } = useTranslation();
        return (<BookmarkWidget instanceId="" size="m" isMock config={{
            url: 'http://example.com',
            title: t('example'),
            icon: 'ion:chatbox-ellipses',
        }} />)
    },
    size: {
        width: 2,
        height: 1,
    }
} as const;


export const bookmarkGroupWidgetSizeSDescriptor = {
    id: 'bookmark-group-s',
    get name() {
        return translate('bookmark-plugin.groupWidgetSizeSName')
    },
    configurationScreen: BookmarGroupkWidgetConfigScreen,
    withAnimation: true,
    mainScreen: ({ config, instanceId }: WidgetRenderProps<BookmarkGroupWidgetConfigType>) => {
        return <BookmarkGroupWidget instanceId={instanceId} config={config} isMock={false} size="s" />
    },
    mock: () => {
        const { t } = useTranslation();
        return (<BookmarkGroupWidget instanceId="" size="s" isMock config={{
            urls: ['http://example.com'],
            openInTabGroup: false,
            title: t('example'),
            icon: 'ion:cloud',
        }} />)
    },
    size: {
        width: 1,
        height: 1,
    }
} as const;

export const bookmarkGroupWidgetSizeMDescriptor = {
    id: 'bookmark-group-m',
    get name() {
        return translate('bookmark-plugin.groupWidgetSizeMName')
    },
    configurationScreen: BookmarGroupkWidgetConfigScreen,
    withAnimation: true,
    mainScreen: ({ config, instanceId }: WidgetRenderProps<BookmarkGroupWidgetConfigType>) => {
        return <BookmarkGroupWidget instanceId={instanceId} config={config} isMock={false} size="m" />
    },
    mock: () => {
        const { t } = useTranslation();
        return (<BookmarkGroupWidget instanceId="" size="m" isMock config={{
            urls: ['http://example.com'],
            openInTabGroup: false,
            title: t('example'),
            icon: 'ion:image',
        }} />)
    },
    size: {
        width: 2,
        height: 1,
    }
} as const;

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
});

export const bookmarkPlugin: AnoriPlugin<{}, BookmarkWidgetConfigType | BookmarkGroupWidgetConfigType> = {
    id: 'bookmark-plugin',
    get name() {
        return translate('bookmark-plugin.name')
    },
    widgets: [
        [
            bookmarkWidgetSizeSDescriptor,
            bookmarkWidgetSizeMDescriptor,
        ],
        [
            bookmarkGroupWidgetSizeSDescriptor,
            bookmarkGroupWidgetSizeMDescriptor,
        ]
    ],
    onCommandInput,
    configurationScreen: null,
    onMessage: handlers,
};

