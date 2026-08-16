import { type ApiClientWithReconnect, createApiClient } from "@anori-app/api-client";
import { API_BASE_URL } from "./consts";
import { getCloudAccount } from "./storage";

let subscriptionClient: ApiClientWithReconnect | null = null;

/**
 * The single WebSocket client shared by every real-time subscription (config sync, synced tabs).
 * tRPC subscriptions need a WebSocket transport, which the HTTP client from getApiClient() doesn't
 * have — so this is a separate client, but one connection per context reused across all subscribers.
 */
export function getSubscriptionClient(): ApiClientWithReconnect {
  if (!subscriptionClient) {
    subscriptionClient = createApiClient({
      url: API_BASE_URL,
      token: () => getCloudAccount()?.sessionToken,
      onOpen: () => {
        console.log("Realtime WebSocket connected");
      },
      onClose: (cause) => {
        console.log("Realtime WebSocket disconnected", cause);
      },
      retryDelayMs: 5000,
    });
  }
  return subscriptionClient;
}
