import { Button } from "@components/Button";
import { Input } from "@components/Input";
import { AnoriPlugin, WidgetConfigurationScreenProps, OnCommandInputCallback, WidgetRenderProps } from "@utils/user-data/types";
import { useEffect, useRef, useState } from "react";
import './styles.scss';
import { Popover, PopoverRenderProps } from "@components/Popover";
import { IconPicker } from "@components/IconPicker";
import { Favicon, Icon } from "@components/Icon";
import { useMemo } from "react";
import clsx from "clsx";
import { getAllWidgetsByPlugin } from "@utils/plugin";
import { parseHost } from "@utils/misc";
import { useLinkNavigationState } from "@utils/hooks";
import { useSizeSettings } from "@utils/compact";
import { Checkbox } from "@components/Checkbox";
import { RequirePermissions } from "@components/RequirePermissions";
import browser from 'webextension-polyfill';
import { ScrollArea } from "@components/ScrollArea";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { translate } from "@translations/index";

type BookmarkWidgetConfigType = {
    url: string,
    title: string,
    icon: string,
    openInNewTab?: boolean,
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
                return (<motion.div
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
                </motion.div>);
            })}
            {filteredBookmarks.length === 0 && <div className="no-results">
                {t('noResults')}
            </div>}
        </ScrollArea>
    </div>);
};

const PickBookmark = (props: PopoverRenderProps<PickBookmarkProps>) => {
    // @ts-expect-error favicon is not present in webextension-polyfill typings yet
    return (<RequirePermissions permissions={["bookmarks", "favicon"]} >
        <_PickBookmark {...props} />
    </RequirePermissions >);
};


const WidgetConfigScreen = ({ saveConfiguration, currentConfig }: WidgetConfigurationScreenProps<BookmarkWidgetConfigType>) => {
    const onConfirm = () => {
        if (!title || !url) return;

        saveConfiguration({ title, url, icon, openInNewTab });
    };
    const [title, setTitle] = useState(currentConfig?.title || '');
    const [url, setUrl] = useState(currentConfig?.url || '');
    const [icon, setIcon] = useState(currentConfig?.icon || 'ion:dice');
    const [openInNewTab, setOpenInNewTab] = useState(currentConfig?.openInNewTab || false);
    const { rem } = useSizeSettings();
    const iconSearchRef = useRef<HTMLInputElement>(null);
    const { t } = useTranslation();

    return (<div className="BookmarkWidget-config">
        <div className="field">
            <label>{t('icon')}:</label>
            <Popover
                component={IconPicker}
                initialFocus={iconSearchRef}
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
                <Popover
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
                </Popover>
            </div>
        </div>

        <div className="open-in-new-tab">
            <Checkbox checked={openInNewTab} onChange={setOpenInNewTab}>{t('bookmark-plugin.openInNewTab')}</Checkbox>
        </div>

        <Button className="save-config" onClick={onConfirm}>{t('save')}</Button>

    </div>);
};

const MainScreen = ({ config, isMock, size }: WidgetRenderProps<BookmarkWidgetConfigType> & { isMock?: boolean, size: 's' | 'm' }) => {
    const host = useMemo(() => parseHost(config.url), [config.url]);
    const { rem } = useSizeSettings();
    const { onLinkClick, isNavigating } = useLinkNavigationState();

    return (<a className={clsx(['BookmarkWidget', `size-${size}`])} href={isMock ? undefined : config.url} onClick={onLinkClick} target={config.openInNewTab ? '_blank' : undefined} rel={config.openInNewTab ? 'noopener noreferrer' : undefined}>
        <div className="text">
            <h2>{config.title}</h2>
            <div className="host">{host}</div>
        </div>
        {(isNavigating && !config.openInNewTab)
            ? (<Icon className="loading" icon="fluent:spinner-ios-20-regular" width={size === 'm' ? rem(5.75) : rem(2.25)} height={size === 'm' ? rem(5.75) : rem(2.25)} />)
            : (<Icon icon={config.icon} width={size === 'm' ? rem(5.75) : rem(2.25)} height={size === 'm' ? rem(5.75) : rem(2.25)} />)
        }
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
    get name() {
        return translate('bookmark-plugin.widgetSizeSName')
    },
    configurationScreen: WidgetConfigScreen,
    withAnimation: true,
    mainScreen: ({ config, instanceId }: WidgetRenderProps<BookmarkWidgetConfigType>) => {
        return <MainScreen instanceId={instanceId} config={config} isMock={false} size="s" />
    },
    mock: () => {
        const { t } = useTranslation();
        return (<MainScreen instanceId="" size="s" isMock config={{
            url: 'http://example.com',
            title: t('example'),
            icon: 'ion:dice',
            openInNewTab: false
        }} />)
    },
    size: {
        width: 1,
        height: 1,
    }
} as const;

const widgetSizeMDescriptor = {
    id: 'bookmark-m',
    get name() {
        return translate('bookmark-plugin.widgetSizeMName')
    },
    configurationScreen: WidgetConfigScreen,
    withAnimation: true,
    mainScreen: ({ config, instanceId }: WidgetRenderProps<BookmarkWidgetConfigType>) => {
        return <MainScreen instanceId={instanceId} config={config} isMock={false} size="m" />
    },
    mock: () => {
        const { t } = useTranslation();
        return (<MainScreen instanceId="" size="m" isMock config={{
            url: 'http://example.com',
            title: t('example'),
            icon: 'ion:dice',
            openInNewTab: false
        }} />)
    },
    size: {
        width: 2,
        height: 1,
    }
} as const;

export const bookmarkPlugin = {
    id: 'bookmark-plugin',
    get name() {
        return translate('bookmark-plugin.name')
    },
    widgets: [
        widgetSizeSDescriptor,
        widgetSizeMDescriptor,
    ],
    onCommandInput,
    configurationScreen: null,
} satisfies AnoriPlugin;