import { setAtomWithStorageValue } from "@anori/utils/storage-legacy/api";
import { getApiClient, updateApiClientToken } from "./api-client";
import { cloudAccountAtom } from "./storage";

export const login = async (email: string, password: string) => {
  const client = getApiClient();
  const result = await client.auth.login.mutate({ email, password });

  updateApiClientToken(result.sessionToken);

  const me = await client.auth.me.query();

  await setAtomWithStorageValue(cloudAccountAtom, {
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

  await setAtomWithStorageValue(cloudAccountAtom, null);
  updateApiClientToken(undefined);
};

export const register = async (email: string, password: string) => {
  const client = getApiClient();
  const result = await client.auth.register.mutate({ email, password });

  updateApiClientToken(result.sessionToken);

  const me = await client.auth.me.query();

  await setAtomWithStorageValue(cloudAccountAtom, {
    sessionToken: result.sessionToken,
    email: me.email,
    userId: me.id,
  });

  return { success: true };
};
