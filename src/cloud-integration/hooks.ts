import { useAtomWithStorage } from "@anori/utils/storage/api";
import { getApiClient } from "./api-client";
import { cloudAccountAtom } from "./storage";

export type CloudConnectionStatus = "connected" | "not-connected";

export const useCloudAccount = () => {
  const [account, setAccount, meta] = useAtomWithStorage(cloudAccountAtom);

  const status: CloudConnectionStatus = account ? "connected" : "not-connected";
  const isConnected = status === "connected";

  return {
    account,
    setAccount,
    status,
    isConnected,
    isLoading: meta.status === "notLoaded",
  };
};

export const useApiClient = () => {
  const { isConnected } = useCloudAccount();

  if (!isConnected) {
    return null;
  }

  return getApiClient();
};
