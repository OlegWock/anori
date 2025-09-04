import type { Browser } from "webextension-polyfill";

export const isChromeLike = <T extends Browser>(browser: T): browser is T & ChromeBrowserAdditions => {
  return X_BROWSER === "chrome";
};

export type BrowserName = "Firefox" | "Opera" | "Edge" | "Brave" | "Chrome" | "Unknown";

export const detectBrowser = (): BrowserName => {
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes("firefox")) {
    return "Firefox";
  }
  if (ua.includes(" opr/")) {
    return "Opera";
  }
  if (ua.includes(" edg/")) {
    return "Edge";
  }
  // @ts-ignore non-standart property
  if (self.navigator.brave) {
    return "Brave";
  }
  if (ua.includes("chrome/")) {
    return "Chrome";
  }

  return "Unknown";
};
