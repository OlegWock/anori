import { type ApiClientWithReconnect, createApiClient } from "@anori-app/api-client";
import { API_BASE_URL } from "./consts";
import { getCloudAccount } from "./storage";

let subscriptionClient: ApiClientWithReconnect | null = null;

function getClient(): ApiClientWithReconnect {
  if (!subscriptionClient) {
    subscriptionClient = createApiClient({
      url: API_BASE_URL,
      token: () => getCloudAccount()?.sessionToken,
      retryDelayMs: 5000,
    });
  }
  return subscriptionClient;
}

/**
 * Subscribes to real-time snapshot changes from the user's other devices (a device pushing an
 * updated tab list, or clearing it). The callback fires on every change; callers refetch their own
 * view. Returns an unsubscribe function.
 */
export function subscribeToSyncedTabsUpdates(onChange: () => void): () => void {
  const subscription = getClient().client.tabs.onSnapshotUpdated.subscribe(undefined, {
    onData: () => onChange(),
    onError: (error) => console.error("Synced tabs subscription error:", error),
  });
  return () => subscription.unsubscribe();
}
