import { createOnMessageHandlers } from "@anori/utils/plugins/messaging";
import type { RssMessageHandlers } from "./types";
import { fetchFeed } from "./utils";

export const { handlers, sendMessage } = createOnMessageHandlers<RssMessageHandlers>("rss-plugin", {
  getFeedText: async (args, _senderTabId) => fetchFeed(args.url),
});
