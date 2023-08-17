import { globalCallOnce } from '@utils/misc';
import browser from 'webextension-polyfill';

export const addUniversalDnrRules = async () => {
    const MODIFY_REQUEST_RULE_ID = 10;
    const MODIFY_RESPONSE_RULE_ID = 11;
    if (!browser.declarativeNetRequest) {
        console.log('declarativeNetRequest API not available')
        return;
    }

    const currentRules = await browser.declarativeNetRequest.getDynamicRules();
    console.log('Checking DNR rules');

    const requestRule = currentRules.find(r => r.id === MODIFY_REQUEST_RULE_ID);
    const responseRule = currentRules.find(r => r.id === MODIFY_RESPONSE_RULE_ID);
    const shouldUpdate = !requestRule || !responseRule || !requestRule.condition.initiatorDomains?.includes(browser.runtime.id) || !responseRule.condition.initiatorDomains?.includes(browser.runtime.id);
    if (!shouldUpdate) {
        console.log('Rule already registered');
        return;
    }

    console.log("Rule isn't registered yet or outdated");
    const actionModifyResponse = {
        type: 'modifyHeaders',
        responseHeaders: [
            { "header": "X-Frame-Options", "operation": "remove" },
            { "header": "Frame-Options", "operation": "remove" },
            { "header": "Content-Security-Policy", "operation": "remove" }
        ],
    } as browser.DeclarativeNetRequest.RuleActionType;

    const actionModifyRequest = {
        type: 'modifyHeaders',
        requestHeaders: [
            { "header": "Sec-Fetch-Site", "operation": "remove" },
            { "header": "Sec-Fetch-Dest", "operation": "remove" }
        ],
    } as browser.DeclarativeNetRequest.RuleActionType;


    return browser.declarativeNetRequest.updateDynamicRules({
        addRules: [{
            id: MODIFY_RESPONSE_RULE_ID,
            condition: {
                initiatorDomains: [browser.runtime.id],
                resourceTypes: ['sub_frame'],
            },
            action: actionModifyResponse,
        }, {
            id: MODIFY_REQUEST_RULE_ID,
            condition: {
                resourceTypes: ['sub_frame'],
                initiatorDomains: [browser.runtime.id],
            },
            action: actionModifyRequest,
        }],
        removeRuleIds: [
            MODIFY_RESPONSE_RULE_ID,
            MODIFY_REQUEST_RULE_ID
        ],
    });
};

export const clearBrowsingData = async (url: string) => {
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
        return browser.browsingData.remove(options, dataToRemove);
    }
};

export const ensureDnrRules = async (url: string) => {
    const addUniversalDnrRulesSIngleton = globalCallOnce('addUniversalDnrRules', addUniversalDnrRules);

    try {
        await Promise.all([
            clearBrowsingData(url),
            addUniversalDnrRulesSIngleton.call(),
        ]);
        console.log('Iframe headers overwrite setup');
    } catch (err) {
        console.log('Err while registering rule', err);
    }
};