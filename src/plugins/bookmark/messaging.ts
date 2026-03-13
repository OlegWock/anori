import { isChromeLike } from "@anori/utils/browser";
import { createOnMessageHandlers } from "@anori/utils/plugins/messaging";
import browser from "webextension-polyfill";
import type { BookmarksMessageHandlers } from "./types";

export const { handlers, sendMessage } = createOnMessageHandlers<BookmarksMessageHandlers>("bookmark-plugin", {
  openGroup: async (args, senderTabId) => {
    const tabs = await Promise.all(
      args.urls.map((url, i) => {
        return browser.tabs.create({
          url,
          active: i === 0,
        });
      }),
    );
    if (senderTabId !== undefined && args.closeCurrentTab) browser.tabs.remove(senderTabId);
    if (args.openInTabGroup && isChromeLike(browser)) {
      const groupId = await browser.tabs.group({
        tabIds: tabs.map((t) => t.id).filter(Boolean),
      });

      await browser.tabGroups.update(groupId, { collapsed: false, title: args.title });
    }
  },
});
