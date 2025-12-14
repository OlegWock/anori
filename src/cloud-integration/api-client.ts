import { type HttpApiClient, createHttpClient, createReactHttpClient, trpc } from "@anori-app/api-client";
import { API_BASE_URL } from "./consts";
import { getCloudAccount } from "./storage";

let apiClient: HttpApiClient | null = null;

export const getApiClient = () => {
  if (!apiClient) {
    apiClient = createHttpClient({
      url: API_BASE_URL,
      token: () => getCloudAccount()?.sessionToken,
    });
  }
  return apiClient.client;
};

export const updateApiClientToken = (token: string | undefined) => {
  if (apiClient) {
    apiClient.setToken(token);
  }
};

export const createReactClient = () => {
  return createReactHttpClient({
    url: API_BASE_URL,
    getToken: () => getCloudAccount()?.sessionToken ?? null,
  });
};

export { trpc };
