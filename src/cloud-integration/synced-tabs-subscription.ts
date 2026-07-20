import { getSubscriptionClient } from "./subscription-client";

export function subscribeToSyncedTabsUpdates(onChange: () => void): () => void {
  const subscription = getSubscriptionClient().client.tabs.onSnapshotUpdated.subscribe(undefined, {
    onData: () => onChange(),
    onError: (error) => console.error("Synced tabs subscription error:", error),
  });
  return () => subscription.unsubscribe();
}
