import type browser from "webextension-polyfill";
import { isCapturableUrl } from "./urls";

export type SnapshotTab = {
  url: string;
  title: string;
  windowId?: number;
  groupId?: number;
  groupName?: string;
  groupColor?: string;
  pinned?: boolean;
  lastActiveAt?: number;
};

const TAB_GROUP_ID_NONE = -1;

export function buildSnapshotTabs(
  tabs: browser.Tabs.Tab[],
  groupsById: Map<number, browser.TabGroups.TabGroup>,
): SnapshotTab[] {
  const result: SnapshotTab[] = [];
  for (const tab of tabs) {
    if (tab.incognito || !isCapturableUrl(tab.url)) continue;

    const snapshot: SnapshotTab = {
      url: tab.url,
      title: tab.title ?? tab.url,
    };
    if (tab.windowId !== undefined) snapshot.windowId = tab.windowId;
    if (tab.pinned) snapshot.pinned = true;
    if (tab.lastAccessed !== undefined) snapshot.lastActiveAt = tab.lastAccessed;

    const groupId = tab.groupId ?? TAB_GROUP_ID_NONE;
    if (groupId !== TAB_GROUP_ID_NONE) {
      snapshot.groupId = groupId;
      const group = groupsById.get(groupId);
      if (group?.title) snapshot.groupName = group.title;
      if (group?.color) snapshot.groupColor = group.color;
    }

    result.push(snapshot);
  }
  return result;
}
