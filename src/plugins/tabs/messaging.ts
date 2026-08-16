import { createOnMessageHandlers } from "@anori/utils/plugins/messaging";
import { addGroup, addLinks, removeEntry, removeGroupLink, renameGroup } from "./stash";
import type { TabsMessageHandlers } from "./types";

// Routed through the background so the write lands on its always-syncing storage instance,
// not the short-lived popup's.
export const { handlers, sendMessage } = createOnMessageHandlers<TabsMessageHandlers>("recently-closed-plugin", {
  stashLinks: (args) => addLinks(args.stashId, args.links),
  stashGroup: async (args) => ({ entryId: await addGroup(args.stashId, args.name, args.links) }),
  renameGroup: (args) => renameGroup(args.entryId, args.name),
  removeEntry: (args) => removeEntry(args.entryId),
  removeGroupLink: (args) => removeGroupLink(args.entryId, args.linkIndex),
});
