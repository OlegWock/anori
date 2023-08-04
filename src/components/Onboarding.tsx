import { useTranslation } from 'react-i18next';
import './Onboarding.scss';
import { ComponentProps, forwardRef, useEffect, useState } from 'react';
import { AnimatePresence, LayoutGroup, m, useTransform } from 'framer-motion';
import useMeasure from 'react-use-motion-measure';
import { useHotkeys, usePrevious } from '@utils/hooks';
import { Button } from './Button';
import { useMotionTransition } from '@utils/animations';
import { slidingScreensAnimation } from './animations';
import { storage, useAtomWithStorage, useBrowserStorageValue } from '@utils/storage';
import { useFolderWidgets, useFolders } from '@utils/user-data/hooks';
import { bookmarkPlugin, bookmarkWidgetSizeMDescriptor, bookmarkWidgetSizeSDescriptor } from '@plugins/bookmark/bookmark-plugin';
import { Icon } from './Icon';
import { Language, availableTranslations, availableTranslationsPrettyNames, switchTranslationLanguage } from '@translations/index';
import { Select } from './Select';
import { metaKeyOnCurrentPlatform } from '@utils/shortcuts';
import { analyticsEnabledAtom } from '@utils/analytics';
import { Checkbox } from './Checkbox';
import { getIpInfo } from '@utils/network';
import { topSitesPlugin, topSitesWidgetDescriptorVertical } from '@plugins/top-sites/top-sites-plugin';
import { searchPlugin, searchWidgetDescriptor } from '@plugins/search/search-plugin';
import { tasksPlugin, tasksWidgetDescriptor } from '@plugins/tasks/tasks-plugin';
import { notesPlugin, notesWidgetDescriptor } from '@plugins/notes/notes-plugin';
import { rssFeedDescriptor, rssPlugin } from '@plugins/rss/rss-plugin';
import { datetimePlugin, datetimeWidgetDescriptorS } from '@plugins/datetime/datetime-plugin';
import { weatherPlugin, weatherWidgetDescriptorCurrent } from '@plugins/weather/weather-plugin';
import { GridDimensions, LayoutItemSize, Position, canPlaceItemInGrid } from '@utils/grid';
import { AnoriPlugin, WidgetDescriptor } from '@utils/user-data/types';


const screens = ['start', 'folders', 'shortcuts', 'customization', 'analytics', 'presets'] as const;

const Section = forwardRef<HTMLDivElement, ComponentProps<typeof m.section>>(({ ...props }, ref) => {
    return (<m.section
        variants={slidingScreensAnimation}
        ref={ref}
        initial="initial"
        animate="show"
        exit="hide"
        {...props}
    />)
});

const navigationButtonVariants = {
    "initial": {
        opacity: 0
    },
    "show": {
        opacity: 1
    },
    "hide": {
        opacity: 0
    },
};

export const Onboarding = ({ gridDimensions }: { gridDimensions: GridDimensions }) => {
    const applyPreset = async () => {
        const addIfPossible = <T extends {}>({ plugin, widget, config, position, size }: { widget: WidgetDescriptor<T>, plugin: AnoriPlugin<any, T>, config: T, position: Position, size?: LayoutItemSize }) => {
            if (canPlaceItemInGrid({
                grid: gridDimensions,
                layout: [],
                item: widget.appearance.size,
                position,
            })) {
                addWidget({
                    plugin,
                    widget,
                    config,
                    position,
                    size,
                });
            }
        };

        console.log('Applying preset');
        const ipInfo = await getIpInfo();
        console.log('Ip info', ipInfo);

        const shouldAddTopSites = X_BROWSER !== 'safari' && canPlaceItemInGrid({
            grid: gridDimensions,
            layout: [],
            item: topSitesWidgetDescriptorVertical.appearance.size,
            position: { x: 0, y: 0 },
        });
        // Top sites widget isn't available in safari
        const compensationForTopSites = shouldAddTopSites ? 0 : -1;

        if (shouldAddTopSites) {
            addWidget({
                plugin: topSitesPlugin,
                widget: topSitesWidgetDescriptorVertical,
                config: {},
                position: {
                    x: 0,
                    y: 0,
                }
            });
        }


        addIfPossible({
            plugin: searchPlugin,
            widget: searchWidgetDescriptor,
            config: {
                defaultProvider: 'google'
            },
            position: {
                x: 1 + compensationForTopSites,
                y: 0,
            }
        });
        addIfPossible({
            plugin: tasksPlugin,
            widget: tasksWidgetDescriptor,
            config: {
                title: t('tasks-plugin.todo')
            },
            position: {
                x: 1 + compensationForTopSites,
                y: 1,
            }
        });
        addIfPossible({
            plugin: bookmarkPlugin,
            widget: bookmarkWidgetSizeMDescriptor,
            config: {
                url: 'https://www.reddit.com/',
                title: 'Reddit',
                icon: 'logos:reddit-icon',
            },
            position: {
                x: 1 + compensationForTopSites,
                y: 3,
            }
        });
        addIfPossible({
            plugin: bookmarkPlugin,
            widget: bookmarkWidgetSizeSDescriptor,
            config: {
                url: 'https://twitter.com/',
                title: 'Twitter',
                icon: 'logos:twitter',
            },
            position: {
                x: 3 + compensationForTopSites,
                y: 1,
            }
        });
        addIfPossible({
            plugin: bookmarkPlugin,
            widget: bookmarkWidgetSizeSDescriptor,
            config: {
                url: 'https://www.instagram.com/',
                title: 'Instagram',
                icon: 'skill-icons:instagram',
            },
            position: {
                x: 4 + compensationForTopSites,
                y: 1,
            }
        });

        addIfPossible({
            plugin: notesPlugin,
            widget: notesWidgetDescriptor,
            config: {},
            position: {
                x: 3 + compensationForTopSites,
                y: 2,
            },
            size: {
                width: 2,
                height: 2,
            }
        });

        addIfPossible({
            // @ts-ignore Need to figure out better typing to allow plugins with multiple widets with different config types
            plugin: rssPlugin,
            widget: rssFeedDescriptor,
            config: {
                title: t('rss-plugin.presetInterestingTitle'),
                feedUrls: [
                    'https://nesslabs.com/feed',
                    'https://ciechanow.ski/atom.xml',
                    'https://maggieappleton.com/rss.xml',
                    'https://www.youtube.com/feeds/videos.xml?channel_id=UCj1VqrHhDte54oLgPG4xpuQ',
                ]
            },
            position: {
                x: 5 + compensationForTopSites,
                y: 0,
            }
        });

        addIfPossible({
            plugin: datetimePlugin,
            widget: datetimeWidgetDescriptorS,
            config: {
                title: ipInfo.city,
                tz: ipInfo.timezone,
                timeFormat: 'HH:mm',
                dateFormat: 'Do MMM Y',
            },
            position: {
                x: 5 + compensationForTopSites,
                y: 3
            }
        });

        if (ipInfo.lat !== undefined && ipInfo.long !== undefined) {
            addIfPossible({
                plugin: weatherPlugin,
                widget: weatherWidgetDescriptorCurrent,
                config: {
                    location: {
                        id: 0,
                        country: ipInfo.country,
                        name: ipInfo.city,
                        latitude: ipInfo.lat,
                        longitude: ipInfo.long,
                    },
                    temperatureUnit: 'c',
                    speedUnit: 'km/h',
                },
                position: {
                    x: 6 + compensationForTopSites,
                    y: 3
                }
            });
        }
    };

    const { t } = useTranslation();
    const [language, setLanguage] = useBrowserStorageValue('language', 'en');
    const [analyticsEnabled, setAnalyticsEnabled] = useAtomWithStorage(analyticsEnabledAtom);


    const [screenIndex, setScreenIndex] = useState<number>(0);
    const prevScreen = usePrevious(screenIndex) || 0;
    const shouldAnimateScreenChange = Math.abs(prevScreen - screenIndex) <= 1;
    const direction = !shouldAnimateScreenChange ? 'none' : prevScreen <= screenIndex ? 'right' : 'left';

    const screenName = screens[screenIndex];

    const { activeFolder } = useFolders(true);
    const { addWidget } = useFolderWidgets(activeFolder);

    const [ref, bounds] = useMeasure();
    const animatedHeight = useMotionTransition(bounds.height, { type: 'tween', duration: 0.15, ignoreInitial: true });

    useHotkeys('right', () => {
        if (screenIndex < screens.length - 1) {
            setScreenIndex(screenIndex + 1);
        }
    }, undefined, [screenIndex]);
    useHotkeys('left', () => {
        if (screenIndex > 0) {
            setScreenIndex(screenIndex - 1);
        }
    }, undefined, [screenIndex]);

    useEffect(() => {
        const main = async () => {
            const finishedOnboarding = await storage.getOne('finishedOnboarding');
            if (finishedOnboarding) {
                setScreenIndex(screens.length - 1);
            }
        };

        main();
    }, []);

    useEffect(() => {
        if (screenIndex === screens.length - 1) {
            storage.setOne('finishedOnboarding', true);
        }
    }, [screenIndex]);

    // Need this to avoid initial flash when animatedHeight is 0
    const animatedHeightCorrected = useTransform(animatedHeight, (val) => val === 0 ? undefined : val);

    return (<div className='Onboarding'>
        <LayoutGroup>
            <m.div
                className="content-wrapper"
                style={{
                    height: animatedHeightCorrected
                }}
            >
                <m.div className="content" ref={ref}>
                    <AnimatePresence initial={false} mode="wait" custom={direction}>
                        {screenName === 'start' && <Section custom={direction} key='start'>
                            <h1>{t('onboarding.start.title')}</h1>
                            <p>{t('onboarding.start.p1', { languages: availableTranslations.map(code => availableTranslationsPrettyNames[code]).join(', ') })}</p>

                            <Select<Language>
                                value={language}
                                onChange={(newLang) => {
                                    console.log('Saving new language', newLang);
                                    setLanguage(newLang);
                                    switchTranslationLanguage(newLang);
                                }}
                                options={availableTranslations}
                                getOptionKey={o => o}
                                getOptionLabel={o => availableTranslationsPrettyNames[o]}
                            />

                            <p>{t('onboarding.start.p2')}</p>

                            <p>{t('onboarding.start.p3')}</p>

                            <p>{t('onboarding.start.p4')}</p>
                        </Section>}
                        {screenName === 'folders' && <Section custom={direction} key='folders'>
                            <h1>{t('onboarding.folders.title')}</h1>
                            <p>{t('onboarding.folders.p1')}</p>
                            <p>{t('onboarding.folders.p2')}</p>
                        </Section>}
                        {screenName === 'shortcuts' && <Section custom={direction} key='shortcuts'>
                            <h1>{t('onboarding.shortcuts.title')}</h1>
                            <p>{t('onboarding.shortcuts.p1')}</p>
                            <p>{t('onboarding.shortcuts.p2', { metaKey: metaKeyOnCurrentPlatform })}</p>
                            <p>{t('onboarding.shortcuts.p3')}</p>
                            <p>{t('onboarding.shortcuts.p4')}</p>
                        </Section>}
                        {screenName === 'customization' && <Section custom={direction} key='customization'>
                            <h1>{t('onboarding.customization.title')}</h1>
                            <p>{t('onboarding.customization.p1')}</p>
                            <p>{t('onboarding.customization.p2')}</p>
                            <p>{t('onboarding.customization.p3')}</p>
                        </Section>}
                        {screenName === 'analytics' && <Section custom={direction} key='analytics'>
                            <h1>{t('onboarding.analytics.title')}</h1>
                            <p>{t('onboarding.analytics.p1')}</p>
                            <p>{t('onboarding.analytics.p2')}</p>

                            <Checkbox className="analytics-checkbox" checked={analyticsEnabled} onChange={setAnalyticsEnabled}>{t("settings.general.enableAnalytics")}</Checkbox>
                        </Section>}
                        {screenName === 'presets' && <Section custom={direction} key='presets'>
                            <h1>{t('onboarding.presets.title')}</h1>
                            <p>{t('onboarding.presets.p1')}</p>
                            <p>{t('onboarding.presets.p2')}</p>
                            <p>{t('onboarding.presets.p3')}</p>

                            <Button className='preset' onClick={() => applyPreset()}>{t('onboarding.presets.cta')}</Button>
                        </Section>}
                    </AnimatePresence>
                </m.div>
            </m.div>
            <m.div className='navigation-buttons' layout>
                <AnimatePresence initial={false}>
                    {screenIndex !== 0 && <Button
                        variants={navigationButtonVariants}
                        initial="initial"
                        animate="show"
                        exit="hide"
                        key='back-btn'
                        onClick={() => setScreenIndex(p => p - 1)}
                    >
                        <Icon icon='ion:chevron-back' width={24} height={24} /> {t('back')}
                    </Button>}
                    <div className="spacer"></div>
                    {(screenIndex !== screens.length - 1) && <Button
                        variants={navigationButtonVariants}
                        initial="initial"
                        animate="show"
                        exit="hide"
                        key='next-btn'
                        onClick={() => {
                            setScreenIndex(p => p + 1);
                        }}
                    >
                        {t('next')} <Icon icon='ion:chevron-forward' width={24} height={24} />
                    </Button>}
                </AnimatePresence>
            </m.div>
        </LayoutGroup>
    </div>);
};