import { anoriSchema, getAnoriStorage } from "@anori/utils/storage";
import { type ApiClientWithReconnect, createApiClient } from "@anori-app/api-client";
import { API_BASE_URL } from "./consts";
import { getCloudAccount } from "./storage";

let subscriptionClient: ApiClientWithReconnect | null = null;
let connectedToken: string | undefined | null = null;
const reconnectListeners = new Set<() => void>();

const reconnectIfTokenChanged = () => {
  if (!subscriptionClient || connectedToken === null) return;
  if (getCloudAccount()?.sessionToken === connectedToken) return;
  connectedToken = null;
  subscriptionClient.reconnect();
  for (const listener of reconnectListeners) listener();
};

/**
 * The single WebSocket client shared by every real-time subscription (config sync, synced tabs).
 * tRPC subscriptions need a WebSocket transport, which the HTTP client from getApiClient() doesn't
 * have — so this is a separate client, but one connection per context reused across all subscribers.
 */
export function getSubscriptionClient(): ApiClientWithReconnect {
  if (!subscriptionClient) {
    subscriptionClient = createApiClient({
      url: API_BASE_URL,
      token: () => {
        connectedToken = getCloudAccount()?.sessionToken;
        return connectedToken;
      },
      onOpen: () => {
        console.log("Realtime WebSocket connected");
      },
      onClose: (cause) => {
        console.log("Realtime WebSocket disconnected", cause);
      },
      retryDelayMs: 5000,
    });
    getAnoriStorage().then((storage) => storage.subscribe(anoriSchema.cloudAccount, reconnectIfTokenChanged));
  }
  return subscriptionClient;
}

export function onSubscriptionClientReconnect(listener: () => void): () => void {
  reconnectListeners.add(listener);
  return () => reconnectListeners.delete(listener);
}
