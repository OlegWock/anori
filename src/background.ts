import { availablePlugins } from '@plugins/all';
import { gatherDailyUsageData, sendAnalyticsIfEnabled } from '@utils/analytics';
import { storage } from '@utils/storage/api';
import browser from 'webextension-polyfill';
import { Language, availableTranslations } from './translations';

console.log('Background init');

const VERSIONS_WITH_CHANGES = [
    '1.1.0', '1.2.0', '1.5.0', '1.6.0', '1.8.0', '1.9.0', '1.10.0', '1.11.0', '1.12.0', '1.13.0', '1.14.0', '1.15.0',
    '1.16.0', '1.17.0', '1.18.0'
];

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


browser.runtime.onInstalled.addListener(async (details) => {
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
    }

    if (details.reason === 'install') {
        browser.tabs.create({
            url: 'https://anori.app/welcome',
            active: true,
        });
        const acceptedLanguages = await browser.i18n.getAcceptLanguages();
        const userLocale = browser.i18n.getUILanguage().replace('_', '-');
        const possibleLanguages = [userLocale, ...acceptedLanguages].map(l => l.toLowerCase());
        let bestCandidate = 'en';
        for (const lang of possibleLanguages) {
            if ((availableTranslations as readonly string[]).includes(lang)) {
                bestCandidate = lang;
                break;
            }
            const withoutRegion = lang.split('-')[0];
            if ((availableTranslations as readonly string[]).includes(withoutRegion)) {
                bestCandidate = withoutRegion;
                break;
            }
        }
        storage.setOne('language', bestCandidate as Language);
    }
});

browser.runtime.onMessage.addListener(async (message, sender) => {
    console.log('onMessage', message);
    if (message.type === 'plugin-command') {
        const plugin = availablePlugins.find(p => p.id === message.pluginId);
        if (!plugin) {
            console.warn('Got message for unknown plugin', message.pluginId);
            return;
        }
        if (!plugin.onMessage || !plugin.onMessage[message.command]) {
            console.warn('Plugin', plugin.id, `can't handle command`, message.command);
            return;
        }

        try {
            return await plugin.onMessage[message.command](message.args, sender?.tab?.id);
        } catch (err) {
            console.error('Error while handling message', err);
        }
    } else if (message.type === 'open-url') {
        if (!sender.tab) return;
        if (message.inNewTab) {
            return browser.tabs.create({
                url: message.url,
                active: message.active ?? false,
                index: sender.tab.index + 1,
            })
        } else {
            return browser.tabs.update(sender.tab.id, {
                url: message.url,
            });
        }
    }

    return true;
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
                console.error(`Error while executing plugin (id ${plugin.id}) sheduled callback`, err);
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
            console.error(`Error while executing plugin (id ${plugin.id}) onStart callback`, err);
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
// @ts-ignore Add this into global scope for debug
self.runScheduledCallbacks = runScheduledCallbacks;
// @ts-ignore Add this into global scope for debug
self.gatherDailyUsageData = gatherDailyUsageData;

// TODO: this seem to be implemented in Safari only recently (https://bugs.webkit.org/show_bug.cgi?id=259950), might want to
// make workaround (with setInterval?) for Safari
browser.alarms.create('scheduledCallbacks', {
    periodInMinutes: 5,
    delayInMinutes: 5,
});

browser.alarms.create('sendAnalytics', {
    periodInMinutes: 60,
});

browser.runtime.setUninstallURL(`https://anori.app/goodbye`);

(X_BROWSER === 'chrome' ? browser.action : browser.browserAction).onClicked.addListener(() => {
    browser.tabs.create({
        url: browser.runtime.getURL('/pages/newtab/start.html'),
        active: true,
    })
});

    // @ts-ignore unknwon onRuleMatchedDebug event
if (X_BROWSER === 'chrome' && X_MODE === 'development' && browser.declarativeNetRequest?.onRuleMatchedDebug) {
    console.log('Setting on rule matched debug');
    // @ts-ignore unknwon onRuleMatchedDebug event
    browser.declarativeNetRequest.onRuleMatchedDebug.addListener((info) => console.log('Matched DNR rule', info));
}

console.log('Background installed all handlers');