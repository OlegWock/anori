import { availablePlugins } from '@plugins/all';
import browser from 'webextension-polyfill';

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
});

browser.alarms.create('scheduledCallbacks', {
    periodInMinutes: 5,
    delayInMinutes: 5,
});

