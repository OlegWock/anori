import { createOnMessageHandlers } from "@anori/utils/plugins/messaging";
import type { BlueprintMessageHandlers } from "./types";

/**
 * Message handlers run in the background worker/page.
 * Use `sendMessage` from widget components to invoke them.
 */
export const { handlers, sendMessage } = createOnMessageHandlers<BlueprintMessageHandlers>("blueprint-plugin", {
  fetchData: async ({ query }) => {
    // Example: fetch data that's only available in the background context
    console.log("Background fetching data for query:", query);
    return { items: [`Result for "${query}"`] };
  },
});
