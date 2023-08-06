import { parseHost } from '@utils/misc';
import browser from 'webextension-polyfill';

export const ensureDnrRule = async (url: string, tabId: number) => {
    if (!browser.declarativeNetRequest) {
        console.log('declarativeNetRequest API not available')
        return;
    }

    const promises: Promise<any>[] = [];
    if (browser.browsingData) {
        const options = X_BROWSER === 'firefox' ? { hostnames: [new URL(url).hostname] } : { origins: [new URL(url).origin] };
        const dataToRemove = X_BROWSER === 'firefox' ? {
            cache: true,
            serviceWorkers: true,
        } : {
            cacheStorage: true,
            serviceWorkers: true,
        };

        // @ts-ignore Types between Chrome and Firefox mismatch
        promises.push(browser.browsingData.remove(options, dataToRemove));
    }
    const currentRules = await browser.declarativeNetRequest.getSessionRules();
    const currentRulesSorted = currentRules.sort((a, b) => a.id - b.id);
    let rulesToRemove: number[] = [];

    if (currentRules.length > browser.declarativeNetRequest.MAX_NUMBER_OF_DYNAMIC_AND_SESSION_RULES * 0.9) {
        rulesToRemove = currentRulesSorted.slice(0, Math.floor(currentRules.length * 0.9)).map(r => r.id);
    }
    const host = parseHost(url);

    console.log('Checking DNR rules for', host, 'in tab', tabId);
    const alreadyRegistered = currentRules.find(r => r.condition.requestDomains?.includes(host) && r.condition.tabIds?.includes(tabId));
    if (alreadyRegistered) {
        console.log('Rule already registered');
        return;
    }


    console.log("Rule isn't registered yet");
    const action = {
        type: 'modifyHeaders',
        responseHeaders: [
            {
                "header": "X-Frame-Options",
                "operation": "remove"
            },
            {
                "header": "Content-Security-Policy",
                "operation": "remove"
            }
        ],
    } as browser.DeclarativeNetRequest.RuleActionType;


    const baseId = parseInt(Date.now().toString().slice(3, -3) + '00') + Math.floor(Math.random() * 100);
    console.log('Will be using baseId', baseId);

    if (currentRules.find(r => r.id === baseId) && !rulesToRemove.includes(baseId)) rulesToRemove.push(baseId);
    if (currentRules.find(r => r.id === baseId + 1) && !rulesToRemove.includes(baseId + 1)) rulesToRemove.push(baseId + 1);

    promises.push(browser.declarativeNetRequest.updateSessionRules({
        addRules: [{
            id: baseId,
            condition: {
                requestDomains: [host],
                resourceTypes: ['sub_frame'],
                tabIds: tabId ? [tabId] : undefined,
            },
            action,
        }, {
            id: baseId + 1,
            condition: {
                initiatorDomains: [host],
                resourceTypes: ['sub_frame'],
                tabIds: tabId ? [tabId] : undefined,
            },
            action,
        }],
        removeRuleIds: rulesToRemove,
    }));
    try {
        await Promise.all(promises);
        console.log('Rule registered');
    } catch (err) {
        console.log('Err while registering rule', err);
    }
};