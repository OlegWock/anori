export const CLOUD_INTEGRATION_ENABLED = X_MODE === "development";

export const CURRENT_API_EPOCH = 1;

export const API_BASE_URL = X_MODE === "development" ? "https://api-staging.anori.app" : "https://api.anori.app";
// export const API_BASE_URL = X_MODE === "development" ? "http://localhost:3001" : "https://api.anori.app";

export const ACCOUNT_URL = X_MODE === "development" ? "https://account-staging.anori.app" : "https://account.anori.app";
