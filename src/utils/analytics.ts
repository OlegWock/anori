import { getAllCustomIconNames } from "./custom-icons";
import { guid, wait } from "./misc";
import { atomWithBrowserStorageStatic, storage } from "./storage";
import { FolderDetailsInStorage } from "./user-data/types";
import mixpanel from 'mixpanel-browser';

export const analyticsEnabledAtom = atomWithBrowserStorageStatic('analyticsEnabled', false);
const ANALYTICS_TIMEOUT = 1000 * 60 * 60 * 24;
const MIXPANEL_TOKEN = '102076bf45f59f216724374916b45d48';

mixpanel.init(MIXPANEL_TOKEN, {
    autotrack: false,
    cross_subdomain_cookie: false,
    disable_persistence: true,
    opt_out_persistence_by_default: true,
    batch_requests: false,
    // @ts-ignore Not sure this prop exist
    track_pageview: false,
});

export const getUserId = async () => {
    let userId = await storage.getOne('userId');
    if (!userId) {
        userId = guid();
        await storage.setOne('userId', userId);
    }

    return userId;
};

export const gatherDailyUsageData = async (): Promise<any> => {
    const folders = await storage.getOne('folders') || [];
    const numberOfCustomFolders = folders.length;

    const customIcons = await getAllCustomIconNames();
    const numberOfCustomIcons = customIcons.length;

    const compactModeStorage = await storage.getOne('compactMode');
    const automaticCompactMode = await storage.getOne('automaticCompactMode');
    const compactMode = automaticCompactMode ? 'auto' : (compactModeStorage ? 'enabled' : 'disabled');

    const usedTheme = await storage.getOne('theme') || '';

    const homeFolderDetails = ((await storage.getOneDynamic('Folder.home')) || { widgets: [] }) as FolderDetailsInStorage;
    const folderDetails = await Promise.all(folders.map(f => storage.getOneDynamic(`Folder.${f.id}`))) as FolderDetailsInStorage[];

    const widgetsUsage: Record<string, number> = {};
    homeFolderDetails.widgets.forEach(w => {
        const key = `wh_${w.widgetId}`;
        if (!widgetsUsage[key]) widgetsUsage[key] = 0;
        widgetsUsage[key] += 1;
    });

    folderDetails.forEach(f => {
        if (!f) return;
        f.widgets.forEach(w => {
            const key = `wo_${w.widgetId}`;
            if (!widgetsUsage[key]) widgetsUsage[key] = 0;
            widgetsUsage[key] += 1;
        });
    });

    return {
        numberOfCustomFolders,
        numberOfCustomIcons,
        compactMode,
        usedTheme,
        ...widgetsUsage
    };
};

export const sendAnalyticsIfEnabled = async (skipTimeout = false) => {
    const enabled = await storage.getOne('analyticsEnabled');
    if (!enabled) return;

    const lastSend = await storage.getOne('analyticsLastSend');
    if (lastSend && (lastSend + ANALYTICS_TIMEOUT) > Date.now() && !skipTimeout) return;

    const data = await gatherDailyUsageData();
    const userId = await getUserId();
    console.log('Before mixpanel call');
    mixpanel.identify(userId);
    const promise = new Promise<void>((resolve) => {
        mixpanel.track('Daily stats', data, { send_immediately: true }, () => resolve());
    });
    await promise;
    await storage.setOne('analyticsLastSend', Date.now());
};

export const trackEvent = async (eventName: string, props: Record<string, any> = {}, timeout = 300) => {
    const enabled = await storage.getOne('analyticsEnabled');
    if (!enabled) return;
    const userId = await getUserId();
    mixpanel.identify(userId);
    const promise = new Promise<void>((resolve) => {
        mixpanel.track(eventName, props, () => resolve());
    });

    return Promise.race([
        wait(timeout),
        promise
    ])
};