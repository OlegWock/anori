import { availablePlugins } from '@plugins/all';
import { sendAnalyticsIfEnabled } from '@utils/analytics';
import { storage } from '@utils/storage';
import browser from 'webextension-polyfill';

console.log('Background init');

const VERSIONS_WITH_CHANGES = ['1.1.0', '1.2.0', '1.5.0', '1.6.0'];

const compareVersions = (v1: string, v2: string): -1 | 0 | 1 => {
    // v1 is newer than v2 => -1
    // v1 and v2 are same => 0
    // v1 is older than v2 => 1
    const v1Tokens = v1.split('.').map(d => parseInt(d));
    const v2Tokens = v2.split('.').map(d => parseInt(d));
    for (let ind = 0; ind < Math.min(v1Tokens.length, v2Tokens.length); ind++) {
        if (v1Tokens[ind] > v2Tokens[ind]) return -1;
        if (v1Tokens[ind] < v2Tokens[ind]) return 1;
    }

    return 0;
};


browser.runtime.onInstalled.addListener((details) => {
    console.log('onInstalled', details);
    if (details.reason === 'update' && details.previousVersion) {
        const { previousVersion } = details;
        const currentVersion = browser.runtime.getManifest().version;

        console.log('Extension updated, prev version:', previousVersion, 'current version:', currentVersion);
        // If at least one of VERSIONS_WITH_CHANGES is newer than previous version
        const hasImportantUpdates = VERSIONS_WITH_CHANGES.some(v => {
            return compareVersions(v, previousVersion) === -1 && compareVersions(v, currentVersion) >= 0;
        });
        console.log('Has important updates:', hasImportantUpdates);
        if (hasImportantUpdates) {
            storage.setOne('hasUnreadReleaseNotes', true);
        }

        // If previous version is older than 1.2.0, migrate to new theme storage format
        if (compareVersions(previousVersion, '1.2.0') === 1) {
            storage.getOne('theme').then(theme => {
                // @ts-ignore We're updating from old storage schema, thus types mismatch
                if (theme.name) storage.setOne('theme', theme.name);
            })
        }
    }

    if (details.reason === 'install') {
        browser.tabs.create({
            url: 'https://anori.sinja.io/welcome',
            active: true,
        });
    }
});

const runScheduledCallbacks = async () => {
    const { scheduledCallbacksInfo } = await browser.storage.session.get({
        'scheduledCallbacksInfo': {},
    });

    const now = Date.now();
    availablePlugins.forEach(plugin => {
        if (!plugin.scheduledCallback) return;
        const lastInvoked = scheduledCallbacksInfo[plugin.id] || 0;
        if (lastInvoked + (plugin.scheduledCallback.intervalInMinutes * 1000 * 60) < now) {
            try {
                plugin.scheduledCallback.callback();
            } catch (err) {
                console.error('Error while executing plugin sheduled callback', err);
            }
            scheduledCallbacksInfo[plugin.id] = now;
        }
    });
    await browser.storage.session.set({ scheduledCallbacksInfo });
};

availablePlugins.forEach(plugin => {
    if (plugin.onStart) {
        try {
            plugin.onStart();
        } catch (err) {
            console.error('Error while executing plugin onStart callback', err);
        }
    }
});


browser.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'scheduledCallbacks') {
        runScheduledCallbacks();
    }
    if (alarm.name === 'sendAnalytics') {
        sendAnalyticsIfEnabled();
    }
});

// @ts-ignore Add this into global scope for debug
self.sendAnalyticsIfEnabled = sendAnalyticsIfEnabled;

browser.alarms.create('scheduledCallbacks', {
    periodInMinutes: 5,
    delayInMinutes: 5,
});

browser.alarms.create('sendAnalytics', {
    periodInMinutes: 60,
});

(X_BROWSER === 'chrome' ? browser.action : browser.browserAction).onClicked.addListener(() => {
    browser.tabs.create({
        url: browser.runtime.getURL('/pages/newtab/start.html'),
        active: true,
    })
});

