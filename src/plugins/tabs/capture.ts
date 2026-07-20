import type { StashLink } from "@anori/utils/storage";
import moment from "moment-timezone";
import browser from "webextension-polyfill";
import { isCapturableUrl } from "./urls";

export { isCapturableUrl } from "./urls";

export type OpenTab = {
  id: number;
  title: string;
  url: string;
};

export type NamedGroup = {
  id: number;
  title: string;
};

export function supportsTabGroups(): boolean {
  return typeof browser.tabGroups !== "undefined";
}

function isCapturableTab(tab: browser.Tabs.Tab): boolean {
  return !tab.incognito && isCapturableUrl(tab.url);
}

function toOpenTab(tab: browser.Tabs.Tab): OpenTab | null {
  if (tab.id === undefined) return null;
  return {
    id: tab.id,
    title: tab.title ?? tab.url ?? "",
    url: tab.url ?? "",
  };
}

export function tabToLink(tab: OpenTab): StashLink {
  return { url: tab.url, title: tab.title };
}

export async function getActiveStashableTab(): Promise<OpenTab | null> {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  if (!tab || !isCapturableTab(tab)) return null;
  return toOpenTab(tab);
}

export async function getStashableTabs(): Promise<OpenTab[]> {
  const tabs = await browser.tabs.query({ currentWindow: true });
  return tabs
    .filter(isCapturableTab)
    .sort((a, b) => {
      if (a.active !== b.active) return a.active ? -1 : 1;
      return (b.lastAccessed ?? 0) - (a.lastAccessed ?? 0);
    })
    .map(toOpenTab)
    .filter((t): t is OpenTab => t !== null);
}

export async function getNamedGroups(): Promise<NamedGroup[]> {
  if (!supportsTabGroups()) return [];
  const groups = await browser.tabGroups.query({});
  return groups.filter((group) => !!group.title).map((group) => ({ id: group.id, title: group.title as string }));
}

export async function getWindowLinks(): Promise<StashLink[]> {
  const tabs = await getStashableTabs();
  return tabs.map(tabToLink);
}

export async function getGroupLinks(groupId: number): Promise<StashLink[]> {
  const tabs = await browser.tabs.query({ groupId });
  return tabs
    .filter(isCapturableTab)
    .map(toOpenTab)
    .filter((t): t is OpenTab => t !== null)
    .map(tabToLink);
}

export function dateLabel(date = new Date()): string {
  // moment can't order month/day per locale ("Jul 9" vs "9 Jul", so outsource that to browser and use
  // moment to only get current locale
  return date.toLocaleDateString(moment.locale(), { month: "short", day: "numeric" });
}
