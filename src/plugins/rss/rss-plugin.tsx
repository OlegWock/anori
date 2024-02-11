import { Button } from "@components/Button";
import { AnoriPlugin, WidgetConfigurationScreenProps, WidgetRenderProps } from "@utils/user-data/types";
import './styles.scss';
import { translate } from "@translations/index";
import { Fragment, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Input } from "@components/Input";
import { RssPost, WidgetStorage, fetchFeed, updateFeedsForWidget, useRssFeeds } from "./utils";
import { createOnMessageHandlers, getAllWidgetsByPlugin, getWidgetStorage } from "@utils/plugin";
import { RequirePermissions } from "@components/RequirePermissions";
import { guid, parseHost, wait } from "@utils/misc";
import { Icon } from "@components/Icon";
import { useSizeSettings } from "@utils/compact";
import moment from "moment-timezone";
import { RelativeTime } from "@components/RelativeTime";
import { ClampTextToFit } from "@components/ClampTextToFit";
import { AnimatePresence, m } from "framer-motion";
import { listItemAnimation } from "@components/animations";
import { ScrollArea } from "@components/ScrollArea";
import { Tooltip } from "@components/Tooltip";
import { Alert } from "@components/Alert";
import { Checkbox } from "@components/Checkbox";
import clsx from "clsx";


const Post = ({ post, clampTitle = false, compact = false }: { post: RssPost, clampTitle?: boolean, compact?: boolean }) => {
    const { rem } = useSizeSettings();
    const { i18n } = useTranslation();
    const postMoment = useMemo(() => moment(post.timestamp), [post.timestamp, i18n.language]);
    const subtitle = useMemo(() => {
        const parser = new DOMParser();
        const plaintext = parser.parseFromString(post.description, 'text/html').documentElement.textContent || '';
        if (plaintext.length > 150) {
            return plaintext.slice(0, 150) + '…';
        }
        return plaintext;
    }, [post.description])

    return (<a className={clsx("Post", compact && "compact")} href={post.url}>
        {clampTitle && <ClampTextToFit withTooltip text={post.title} as="h3" className="title" />}
        {!clampTitle && <>
            <h3 className="title">
                {post.title}
                {compact && <span className="compact-post-date">&nbsp;·&nbsp;<RelativeTime m={postMoment} /></span>}
            </h3>
            {!compact && <div className="description">{subtitle}</div>}
        </>}
        {!compact && <div className="details">
            <div className="feed-name"><Icon icon="ion:logo-rss" height={rem(1)} /> <span>{post.feed.title}</span></div>
            <div className="post-date"><Icon icon="ion:time-outline" height={rem(1)} /> <span><RelativeTime m={postMoment} /></span></div>
        </div>}
    </a>);
};

type RssFeedConfigType = {
    title: string,
    feedUrls: string[],
    compactView?: boolean,
};

const RssFeedConfigScreen = ({ saveConfiguration, currentConfig }: WidgetConfigurationScreenProps<RssFeedConfigType>) => {
    const onConfirm = () => {
        const cleanedUrls = urls.map(u => u.url).filter(u => !!u);
        if (cleanedUrls.length) {
            saveConfiguration({ title, feedUrls: cleanedUrls, compactView });
        }
    };

    const [title, setTitle] = useState(currentConfig ? currentConfig.title : '');
    const [urls, setUrls] = useState(currentConfig ? currentConfig.feedUrls.map(url => ({ url, id: guid() })) : [{ url: '', id: guid() }]);
    const [compactView, setCompactView] = useState(currentConfig ? currentConfig.compactView : false);
    const { rem } = useSizeSettings();
    const { t } = useTranslation();

    const presets = [
        {
            name: t('rss-plugin.presetForDevelopers'),
            title: t('rss-plugin.presetForDevelopersTitle'),
            urls: [
                'https://blog.pragmaticengineer.com/rss/',
                'https://unicornclub.dev/feed/',
                'https://indepth.dev/rss',
                'https://api.devblogs.co/feed.xml'
            ],
        }, {
            name: t('rss-plugin.presetForDesigners'),
            title: t('rss-plugin.presetForDesignersTitle'),
            urls: [
                'https://www.designernews.co/?format=rss',
                'http://heydesigner.com/feed/',
                'https://webdesignernews.com/feed/',
                'https://www.marcandrew.me/rss/',
                'https://sidebar.io/feed.xml',
                'https://uxdesign.cc/feed',
            ],
        }, {
            name: t('rss-plugin.presetInteresting'),
            title: t('rss-plugin.presetInterestingTitle'),
            urls: [
                'https://nesslabs.com/feed',
                'https://ciechanow.ski/atom.xml',
                'https://maggieappleton.com/rss.xml',
                'https://www.youtube.com/feeds/videos.xml?channel_id=UCj1VqrHhDte54oLgPG4xpuQ',
            ],
        }
    ];

    return (<m.div className="RssFeed-config">
        <div className="field">
            <label>{t('title')}:</label>
            <Input value={title} placeholder={t('title')} onChange={(e) => setTitle(e.target.value)} />
        </div>

        <div className="field">
            <label>{t('rss-plugin.feedUrls')}:</label>

            <Alert level="info">
                <div>{t('rss-plugin.presetsTitle')}</div>
                <div className="presets">
                    {presets.map(({ title, name, urls }) => {
                        return (<Button
                            className="preset"
                            key={title}
                            onClick={() => {
                                setTitle(title);
                                setUrls(prev => {
                                    return urls.map((url, ind) => ({ id: prev[ind]?.id || guid(), url }));
                                });
                            }}
                        >
                            {name}
                        </Button>)
                    })}
                </div>
            </Alert>

            <div className="urls">
                <AnimatePresence initial={false}>
                    {urls.map(({ id, url }, ind) => {
                        return (<m.div
                            className="url-wrapper"
                            layout
                            key={id}
                            {...listItemAnimation}
                        >
                            <Input value={url} placeholder={t('rss-plugin.feedUrl')} onValueChange={(newUrl) => setUrls(p => {
                                const copy = [...p];
                                copy[ind].url = newUrl;
                                return copy;
                            })} />
                            <Button onClick={() => setUrls(p => p.filter((u, i) => i !== ind))}><Icon icon='ion:close' height={22} /></Button>
                        </m.div>);
                    })}
                </AnimatePresence>
            </div>
        </div>

        <m.div layout className="button-wrapper">
            <Button className="add-button" onClick={() => setUrls((p) => [...p, { id: guid(), url: '' }])}>{t('add')}</Button>
        </m.div>
        
        <m.div layout>
            <Checkbox checked={compactView} onChange={setCompactView}>{t('rss-plugin.compactView')}</Checkbox>
        </m.div>

        <m.div layout className="button-wrapper">
            <Button className="save-config" onClick={onConfirm}>{t('save')}</Button>
        </m.div>
    </m.div>);
};

const RssFeed = ({ config, instanceId }: WidgetRenderProps<RssFeedConfigType>) => {
    const { t, i18n } = useTranslation();
    const { rem } = useSizeSettings();
    const { feed, isRefreshing, refresh, lastUpdated } = useRssFeeds(
        config.feedUrls,
        (url) => sendMessage('getFeedText', { url }),
    );

    const lastRefresh = useMemo(() => lastUpdated ? t('lastUpdatedAt', { datetime: lastUpdated.format('HH:mm') }) : t('refreshing'), [lastUpdated, i18n.language]);
    const trimmedFeed = feed.slice(0, 100);

    return (<div className="RssFeed">
        <div className="title-wrapper">
            <h2>{config.title}</h2>
            <Tooltip label={lastRefresh}>
                <Button className="refresh-button" visuallyDisabled={isRefreshing} onClick={() => refresh()}>
                    <Icon
                        icon="jam:refresh"
                        height={rem(1.25)}
                        variants={{
                            loading: { rotate: [0, 360] }
                        }}
                        animate={isRefreshing ? "loading" : undefined}
                        transition={{ duration: 2, repeat: isRefreshing ? Infinity : 0, repeatDelay: 0.2, ease: 'easeInOut' }}
                    />
                </Button>
            </Tooltip>
        </div>
        <ScrollArea type="hover" color="dark">
            <div className={clsx("posts", config.compactView && "compact")}>
                {trimmedFeed.map((post, i) => {
                    if (i === 0) return (<Post post={post} key={post.url} compact={config.compactView} />);

                    return (<Fragment key={post.url}>
                        <div className="separator"></div>
                        <Post post={post} compact={config.compactView} />
                    </Fragment>)
                })}
            </div>
        </ScrollArea>
    </div>);
};

const RssFeedMock = () => {
    const { t, i18n } = useTranslation();
    const { rem } = useSizeSettings();

    const feed: RssPost[] = [
        {
            title: t('rss-plugin.examplePostTitle1'),
            description: t('rss-plugin.examplePostDescription1'),
            url: '',
            timestamp: Date.now() - 1000 * 60 * 60 * 1,
            feed: {
                title: t('rss-plugin.exampleFeedTitle1'),
                description: '',
                url: '#',
            }
        },
        {
            title: t('rss-plugin.examplePostTitle2'),
            description: t('rss-plugin.examplePostDescription2'),
            url: '',
            timestamp: Date.now() - 1000 * 60 * 60 * 3,
            feed: {
                title: t('rss-plugin.exampleFeedTitle2'),
                description: '',
                url: '#',
            }
        },
        {
            title: t('rss-plugin.examplePostTitle3'),
            description: t('rss-plugin.examplePostDescription3'),
            url: '',
            timestamp: Date.now() - 1000 * 60 * 60 * 5,
            feed: {
                title: t('rss-plugin.exampleFeedTitle3'),
                description: '',
                url: '#',
            }
        },
    ];

    return (<div className="RssFeed">
        <div className="title-wrapper">
            <h2>{t('rss-plugin.name')}</h2>
            <Button className="refresh-button">
                <Icon
                    icon="jam:refresh"
                    height={rem(1.25)}
                />
            </Button>
        </div>
        <ScrollArea type="hover" color="dark">
            <div className="posts">
                {feed.map((post, i) => {
                    if (i === 0) return (<Post post={post} key={i.toString()} />);

                    return (<Fragment key={i.toString()}>
                        <div className="separator"></div>
                        <Post post={post} />
                    </Fragment>)
                })}
            </div>
        </ScrollArea>
    </div>);
};

type RssLatestPostConfigType = {
    feedUrl: string,
};

const RssLatestPostConfigScreen = ({ saveConfiguration, currentConfig }: WidgetConfigurationScreenProps<RssLatestPostConfigType>) => {
    const onConfirm = async () => {
        saveConfiguration({ feedUrl });
    };

    const [feedUrl, setFeedUrl] = useState(currentConfig ? currentConfig.feedUrl : '');
    const { t } = useTranslation();

    return (<div className="RssFeed-config">
        <div>
            <label>{t('rss-plugin.feedUrl')}:</label>
            <Input value={feedUrl} onValueChange={setFeedUrl} />
        </div>

        <Button className="save-config" onClick={onConfirm}>Save</Button>
    </div>);
};

const RssLatestPost = ({ config, instanceId }: WidgetRenderProps<RssLatestPostConfigType>) => {
    const { t } = useTranslation();
    const feeds = useMemo(() => [config.feedUrl], [config.feedUrl]);
    const { feed, isRefreshing } = useRssFeeds(
        feeds,
        (url) => sendMessage('getFeedText', { url }),
    );

    const lastPost = feed[0];

    return (<div className="RssLatestPost">
        {!!lastPost && <Post clampTitle post={lastPost} key={lastPost.url} />}
        {!lastPost && <>
            {isRefreshing && <>{t('refreshing')}</>}
            {!isRefreshing && <>{t('rss-plugin.noPosts')}</>}
        </>}
    </div>);
};

const RssLatestPostMock = () => {
    const { t } = useTranslation();
    return (<div className="RssLatestPost">
        <Post
            post={{
                title: t('rss-plugin.examplePostTitle1'),
                description: '',
                url: '#',
                timestamp: Date.now() - 1000 * 60 * 60 * 18,
                feed: {
                    title: t('rss-plugin.exampleFeedTitle1'),
                    url: '#',
                    description: '',
                }
            }}
        />
    </div>);
};

type RssMessageHandlers = {
    'getFeedText': {
        args: {
            url: string,
        },
        result: string
    }
}

const { handlers, sendMessage } = createOnMessageHandlers<RssMessageHandlers>('rss-plugin', {
    'getFeedText': async (args, senderTabId) => fetchFeed(args.url),
});

export const rssFeedDescriptor = {
    id: 'rss-feed',
    get name() {
        return translate('rss-plugin.widgetFeedName');
    },
    configurationScreen: RssFeedConfigScreen,
    withAnimation: false,
    mainScreen: (props: WidgetRenderProps<RssFeedConfigType>) => (<RequirePermissions hosts={props.config.feedUrls.map(u => parseHost(u))}>
        <RssFeed {...props} />
    </RequirePermissions>),
    mock: RssFeedMock,
    appearance: {
        resizable: {
            min: { width: 2, height: 2 },
        },
        size: {
            width: 3,
            height: 3,
        }
    }
} as const;

export const rssLastestPostDescriptor = {
    id: 'rss-latest-post',
    get name() {
        return translate('rss-plugin.widgetLatestPostName');
    },
    configurationScreen: RssLatestPostConfigScreen,
    withAnimation: true,
    mainScreen: (props: WidgetRenderProps<RssLatestPostConfigType>) => (<RequirePermissions compact hosts={[parseHost(props.config.feedUrl)]} permissions={["tabs"]}>
        <RssLatestPost {...props} />
    </RequirePermissions>),
    mock: RssLatestPostMock,
    appearance: {
        resizable: false,
        size: {
            width: 2,
            height: 1,
        }
    }
} as const;

export const rssPlugin = {
    id: 'rss-plugin',
    get name() {
        return translate('rss-plugin.name');
    },
    widgets: [
        rssFeedDescriptor,
        rssLastestPostDescriptor,
    ],
    onMessage: handlers,
    scheduledCallback: {
        intervalInMinutes: 30,
        callback: async () => {
            console.log('Updating feeds in background');
            const widgets = await getAllWidgetsByPlugin<{}, RssFeedConfigType | RssLatestPostConfigType>(rssPlugin);
            const promises = widgets.map(async (w) => {
                const storage = getWidgetStorage<WidgetStorage>(w.instanceId);
                await storage.waitForLoad();
                if ('feedUrl' in w.configutation) {
                    return updateFeedsForWidget([w.configutation.feedUrl], storage);
                } else {
                    return updateFeedsForWidget(w.configutation.feedUrls, storage);
                }
            });
            await Promise.all(promises);
            await wait(1000); // Make sure widget storage synced to the disk
            console.log('Updated all RSS feeds in background');
        },
    },
    configurationScreen: null,
} satisfies AnoriPlugin;