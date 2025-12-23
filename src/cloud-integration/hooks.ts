import { anoriSchema, useWritableStorageValue } from "@anori/utils/storage";
import { getApiClient } from "./api-client";

export type CloudConnectionStatus = "connected" | "not-connected";

export const useCloudAccount = () => {
  const [account, setAccount] = useWritableStorageValue(anoriSchema.latestSchema.definition.cloudAccount);

  const status: CloudConnectionStatus = account ? "connected" : "not-connected";
  const isConnected = status === "connected";

  return {
    account,
    setAccount,
    status,
    isConnected,
  };
};

export const useApiClient = () => {
  const { isConnected } = useCloudAccount();

  if (!isConnected) {
    return null;
  }

  return getApiClient();
};
