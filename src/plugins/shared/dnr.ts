import { globalCallOnce } from '@utils/misc';
import { CorrectPermission } from '@utils/permissions';
import browser from 'webextension-polyfill';

export const dnrPermissions: CorrectPermission[] = ["declarativeNetRequestWithHostAccess", "webRequest", "webRequestBlocking", "browsingData"];

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

const webResponseHandler = (details: browser.WebRequest.OnHeadersReceivedDetailsType) => {
    if (!details.originUrl?.includes(location.host)) {
        return;
    }

    return {
        responseHeaders: details.responseHeaders!.filter(h => {
            return !['x-frame-options', 'frame-options', 'content-security-policy'].includes(h.name.toLowerCase());
        }),
    };
};

const webRequestHandler = (details: browser.WebRequest.OnBeforeSendHeadersDetailsType) => {
    if (!details.originUrl?.includes(location.host)) {
        return;
    }

    return {
        requestHeaders: details.requestHeaders!.filter(h => {
            return !['sec-fetch-site', 'sec-fetch-dest'].includes(h.name.toLowerCase());
        }),
    };
};

export const plantWebRequestHandler = () => {
    if (!browser.webRequest) {
        console.log('webRequest API not available');
        return;
    }
    browser.webRequest.onHeadersReceived.removeListener(webResponseHandler);
    browser.webRequest.onHeadersReceived.addListener(webResponseHandler, {urls: ['<all_urls>']}, ["responseHeaders", "blocking"]);
    browser.webRequest.onBeforeSendHeaders.removeListener(webRequestHandler);
    browser.webRequest.onBeforeSendHeaders.addListener(webRequestHandler, {urls: ['<all_urls>']}, ['requestHeaders', "blocking"]);
    console.log('Planted webRequest listener');
};

export const ensureDnrRules = async (url: string) => {
    const addUniversalDnrRulesSingleton = globalCallOnce('addUniversalDnrRules', addUniversalDnrRules);
    const plantWebRequestHandlerSingleton = globalCallOnce('plantWebRequestHandler', plantWebRequestHandler);

    try {
        await Promise.all([
            clearBrowsingData(url),
            addUniversalDnrRulesSingleton.call(),
            plantWebRequestHandlerSingleton.call(),
        ]);
        console.log('Iframe headers overwrite setup');
    } catch (err) {
        console.log('Err while registering rule', err);
    }
};