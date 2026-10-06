import { getSubscriptionClient, onSubscriptionClientReconnect } from "./subscription-client";

export function subscribeToSyncedTabsUpdates(onChange: () => void): () => void {
  const subscribe = () =>
    getSubscriptionClient().client.tabs.onSnapshotUpdated.subscribe(undefined, {
      onData: () => onChange(),
      onError: (error) => console.error("Synced tabs subscription error:", error),
    });
  let subscription = subscribe();
  const stopListening = onSubscriptionClientReconnect(() => {
    subscription.unsubscribe();
    subscription = subscribe();
  });
  return () => {
    stopListening();
    subscription.unsubscribe();
  };
}
