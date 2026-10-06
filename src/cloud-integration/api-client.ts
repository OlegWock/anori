import { createHttpClient, createReactHttpClient, type HttpApiClient, trpc } from "@anori-app/api-client";
import { API_BASE_URL } from "./consts";
import { getCloudAccount } from "./storage";

let apiClient: HttpApiClient | null = null;
let pendingSessionToken: string | undefined;

const getSessionToken = () => pendingSessionToken ?? getCloudAccount()?.sessionToken;

export const getApiClient = () => {
  if (!apiClient) {
    apiClient = createHttpClient({
      url: API_BASE_URL,
      token: getSessionToken,
    });
  }
  return apiClient.client;
};

// @ts-expect-error for debug
self.getApiClient = getApiClient;

export const setPendingSessionToken = (token: string | undefined) => {
  pendingSessionToken = token;
};

export const createReactClient = () => {
  return createReactHttpClient({
    url: API_BASE_URL,
    getToken: () => getSessionToken() ?? null,
  });
};

export { trpc };
