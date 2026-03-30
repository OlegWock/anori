import { isAppErrorOfType } from "@anori-app/api-client";
import { SessionExpiredError, UnauthorizedError } from "@anori-app/api-types";
import { anoriSchema, getAnoriStorage } from "@anori/utils/storage";
import { getApiClient, updateApiClientToken } from "./api-client";
import { getDeviceName } from "./device-name";
import { disconnectFromProfile } from "./sync-manager";

export const login = async (email: string, password: string) => {
  const client = getApiClient();
  const result = await client.auth.login.mutate({
    email,
    password,
    clientType: "extension",
    deviceName: getDeviceName(),
  });

  updateApiClientToken(result.sessionToken);

  const me = await client.auth.me.query();

  const storage = await getAnoriStorage();
  await storage.set(anoriSchema.cloudAccount, {
    sessionToken: result.sessionToken,
    email: me.email,
    userId: me.id,
  });

  return { success: true };
};

export const logout = async () => {
  const client = getApiClient();

  try {
    await client.auth.logout.mutate();
  } catch (_e) {
    // Ignore errors during logout
  }

  const storage = await getAnoriStorage();
  await disconnectFromProfile(storage);
  await storage.set(anoriSchema.cloudAccount, null);
  updateApiClientToken(undefined);
};

/**
 * Clears the local session without calling the backend.
 * Use when the session is already invalid (expired/unauthorized).
 */
export const clearSession = async () => {
  const storage = await getAnoriStorage();
  await disconnectFromProfile(storage);
  await storage.set(anoriSchema.cloudAccount, null);
  updateApiClientToken(undefined);
};

export const isSessionError = (error: unknown): boolean => {
  return isAppErrorOfType(error, SessionExpiredError) || isAppErrorOfType(error, UnauthorizedError);
};

export const register = async (email: string, password: string) => {
  const client = getApiClient();
  const result = await client.auth.register.mutate({
    email,
    password,
    clientType: "extension",
    deviceName: getDeviceName(),
  });

  updateApiClientToken(result.sessionToken);

  const me = await client.auth.me.query();

  const storage = await getAnoriStorage();
  await storage.set(anoriSchema.cloudAccount, {
    sessionToken: result.sessionToken,
    email: me.email,
    userId: me.id,
  });

  return { success: true };
};
