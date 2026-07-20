import { initTranslation, switchTranslationLanguage, translate } from "@anori/translations/utils";
import { cachedFunc } from "@anori/utils/misc";
import { anoriSchema, getAnoriStorage } from "@anori/utils/storage";
import browser from "webextension-polyfill";
import { dateLabel, getGroupLinks, isCapturableUrl, supportsTabGroups } from "./capture";
import { DEFAULT_STASH_ID } from "./consts";
import { addGroup, addLinks, ensureDefaultStash } from "./stash";
import { startTabSync } from "./tab-sync";

const STASH_PAGE_MENU_ID = "anori-stash-page";
const STASH_LINK_MENU_ID = "anori-stash-link";
const STASH_GROUP_MENU_ID = "anori-stash-group";
const STASH_MENU_IDS = [STASH_PAGE_MENU_ID, STASH_LINK_MENU_ID, STASH_GROUP_MENU_ID];

const ensureTranslations = cachedFunc(initTranslation);

// Chromium's sentinel for "tab is not in a group".
const TAB_GROUP_ID_NONE = -1;

// The "tab" context (right-clicking the tab strip) exists only in Firefox's menus API; Chrome rejects it.
const supportsTabContext = X_BROWSER === "firefox";

async function registerContextMenus(): Promise<void> {
  if (!browser.contextMenus) return;
  await ensureTranslations();
  await Promise.all(STASH_MENU_IDS.map((id) => browser.contextMenus.remove(id).catch(() => {})));

  browser.contextMenus.create({
    id: STASH_LINK_MENU_ID,
    title: translate("tabs-plugin.contextMenu.stashLink"),
    contexts: ["link"],
  });

  browser.contextMenus.create({
    id: STASH_PAGE_MENU_ID,
    title: translate("tabs-plugin.contextMenu.stashTab"),
    contexts: supportsTabContext ? ["page", "tab"] : ["page"],
  });

  if (supportsTabContext && supportsTabGroups()) {
    browser.contextMenus.create({
      id: STASH_GROUP_MENU_ID,
      title: translate("tabs-plugin.contextMenu.stashGroup"),
      contexts: ["tab"],
    });
  }
}

async function handleMenuClick(info: browser.Menus.OnClickData, tab: browser.Tabs.Tab | undefined): Promise<void> {
  await ensureTranslations();

  if (info.menuItemId === STASH_LINK_MENU_ID) {
    if (isCapturableUrl(info.linkUrl)) {
      await addLinks(DEFAULT_STASH_ID, [{ url: info.linkUrl, title: info.linkText || info.linkUrl }]);
    }
    return;
  }

  if (info.menuItemId === STASH_PAGE_MENU_ID) {
    if (tab && isCapturableUrl(tab.url)) {
      await addLinks(DEFAULT_STASH_ID, [{ url: tab.url, title: tab.title ?? tab.url }]);
    }
    return;
  }

  if (info.menuItemId === STASH_GROUP_MENU_ID && tab) {
    const groupId = tab.groupId ?? TAB_GROUP_ID_NONE;
    if (groupId === TAB_GROUP_ID_NONE) {
      if (isCapturableUrl(tab.url)) {
        await addLinks(DEFAULT_STASH_ID, [{ url: tab.url, title: tab.title ?? tab.url }]);
      }
      return;
    }
    const links = await getGroupLinks(groupId);
    if (links.length === 0) return;
    const group = await browser.tabGroups.get(groupId);
    const name = group.title || `${translate("tabs-plugin.tabGroup")} · ${dateLabel()}`;
    await addGroup(DEFAULT_STASH_ID, name, links);
  }
}

async function watchLocaleChanges(): Promise<void> {
  const storage = await getAnoriStorage();
  storage.subscribe(anoriSchema.language, async (lang) => {
    await switchTranslationLanguage(lang ?? "en");
    await registerContextMenus();
  });
}

export function registerTabsBackground(): void {
  ensureDefaultStash();
  registerContextMenus();

  if (browser.contextMenus) {
    browser.contextMenus.onClicked.addListener((info, tab) => {
      handleMenuClick(info, tab);
    });
    watchLocaleChanges();
  }

  startTabSync();
}
