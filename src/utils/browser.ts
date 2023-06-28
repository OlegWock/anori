import { Browser } from "webextension-polyfill";

export const isChromeLike = <T extends Browser>(browser: T): browser is T & ChromeBrowserAdditions => {
    return X_BROWSER === 'chrome';
}