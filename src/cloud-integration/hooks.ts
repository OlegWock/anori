import { anoriSchema, anoriVersionedSchema } from "@anori/utils/storage";
import { useStorageValue } from "@anori/utils/storage-lib";

import { getApiClient } from "./api-client";

export type CloudConnectionStatus = "connected" | "not-connected";

export const useCloudAccount = () => {
  const [account, setAccount] = useStorageValue(anoriSchema.cloudAccount);

  const status: CloudConnectionStatus = account ? "connected" : "not-connected";
  const isConnected = status === "connected";

  return {
    account,
    setAccount,
    status,
    isConnected,
  };
};

export const useIsBehindCloudSchema = (): boolean => {
  const [syncSettings] = useStorageValue(anoriSchema.cloudSyncSettings);
  const [userSyncState] = useStorageValue(anoriSchema.cloudUserSyncState);
  const localVersion = anoriVersionedSchema.currentVersion;
  // Scopes pause independently, but the remedy is the same either way: update the extension.
  const observedProfile = syncSettings?.profileSchemaVersion;
  const observedUser = userSyncState?.userSchemaVersion;
  return (
    (observedProfile !== undefined && localVersion < observedProfile) ||
    (observedUser !== undefined && localVersion < observedUser)
  );
};

export const useApiClient = () => {
  const { isConnected } = useCloudAccount();

  if (!isConnected) {
    return null;
  }

  return getApiClient();
};
