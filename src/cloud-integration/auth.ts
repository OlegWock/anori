import { anoriSchema, getAnoriStorage } from "@anori/utils/storage";
import { isAppErrorOfType } from "@anori-app/api-client";
import { SessionExpiredError, UnauthorizedError } from "@anori-app/api-types";
import { getApiClient, updateApiClientToken } from "./api-client";
import { getOrCreateDeviceId } from "./device-id";
import { getBrowser, getDeviceName, getOS } from "./device-name";
import { disconnectFromProfile, getSyncManager, performSync, startSync } from "./sync-manager";

export type PendingLogin = {
  sessionToken: string;
  email: string;
  userId: string;
};

export type LoginResult =
  | { status: "ok" }
  /**
   * Authenticated, but local user-scope data was last synced against a different account.
   * The account is NOT persisted yet — the caller must resolve via completePendingLogin
   * (or back out via cancelPendingLogin).
   */
  | { status: "userDataConflict"; pending: PendingLogin };

async function hasForeignUserData(userId: string): Promise<boolean> {
  const storage = await getAnoriStorage();
  const state = storage.get(anoriSchema.cloudUserSyncState);
  if (!state?.ownerUserId || state.ownerUserId === userId) {
    return false;
  }
  const { kv, files } = storage.sync.exportForFullSync("user");
  return Object.values(kv).some((record) => !record.deleted) || Object.keys(files).length > 0;
}

/**
 * Persists the authenticated account and brings the user sync scope online. `localUserData`
 * decides what happens to user-scope data already on this device:
 * - "merge" — ordinary LWW merge; newer copies in the account win (same-account logins)
 * - "forcePush" — re-stamp local records with fresh HLCs so the local copy beats the
 *   account's data everywhere (the explicit "upload my copy" choice)
 * - "discard" — hard-delete the local copy and adopt the account's store
 */
async function finalizeLogin(pending: PendingLogin, localUserData: "merge" | "forcePush" | "discard"): Promise<void> {
  const storage = await getAnoriStorage();
  const state = storage.get(anoriSchema.cloudUserSyncState);
  const foreignOwner = state?.ownerUserId !== undefined && state.ownerUserId !== pending.userId;

  if (localUserData === "discard") {
    await storage.sync.purgeScopeData("user");
    await storage.set(anoriSchema.cloudUserSyncState, null);
  } else if (localUserData === "merge" && foreignOwner) {
    // A foreign owner on the merge path means the residue is tombstones only (live foreign
    // records trigger the conflict prompt instead). Another account's deletions are
    // meaningless here — drop them rather than push them into this account's store.
    await storage.sync.purgeScopeData("user");
    await storage.set(anoriSchema.cloudUserSyncState, null);
  } else {
    await storage.sync.enqueueScopeToOutbox("user", { restampHlc: localUserData === "forcePush" });
    // Cursor/version bookkeeping belongs to the previous account's store
    if (foreignOwner) {
      await storage.set(anoriSchema.cloudUserSyncState, null);
    }
  }

  await storage.set(anoriSchema.cloudAccount, pending);
  startSync(storage);
  await performSync(storage);
  await getSyncManager(storage).flushPendingChanges();
}

async function authenticate(
  result: { sessionToken: string },
  client: ReturnType<typeof getApiClient>,
): Promise<LoginResult> {
  updateApiClientToken(result.sessionToken);

  const me = await client.auth.me.query();
  const pending: PendingLogin = { sessionToken: result.sessionToken, email: me.email, userId: me.id };

  if (await hasForeignUserData(me.id)) {
    return { status: "userDataConflict", pending };
  }

  await finalizeLogin(pending, "merge");
  return { status: "ok" };
}

export const login = async (email: string, password: string): Promise<LoginResult> => {
  const client = getApiClient();
  const result = await client.auth.login.mutate({
    email,
    password,
    clientType: "extension",
    deviceName: getDeviceName(),
    deviceId: await getOrCreateDeviceId(),
    browser: getBrowser(),
    os: getOS(),
  });

  return authenticate(result, client);
};

export const register = async (email: string, password: string): Promise<LoginResult> => {
  const client = getApiClient();
  const result = await client.auth.register.mutate({
    email,
    password,
    clientType: "extension",
    deviceName: getDeviceName(),
    deviceId: await getOrCreateDeviceId(),
    browser: getBrowser(),
    os: getOS(),
  });

  return authenticate(result, client);
};

export const completePendingLogin = async (
  pending: PendingLogin,
  localUserData: "upload" | "discard",
): Promise<void> => {
  await finalizeLogin(pending, localUserData === "upload" ? "forcePush" : "discard");
};

/** Backs out of an unresolved userDataConflict login: revokes the session, clears the token. */
export const cancelPendingLogin = async (): Promise<void> => {
  const client = getApiClient();
  try {
    await client.auth.logout.mutate();
  } catch (_e) {
    // Ignore errors during logout
  }
  updateApiClientToken(undefined);
};

export const logout = async () => {
  const client = getApiClient();

  try {
    await client.auth.logout.mutate();
  } catch (_e) {
    // Ignore errors during logout
  }

  const storage = await getAnoriStorage();
  await storage.set(anoriSchema.cloudAccount, null);
  await disconnectFromProfile(storage);
  updateApiClientToken(undefined);
};

/**
 * Clears the local session without calling the backend.
 * Use when the session is already invalid (expired/unauthorized).
 */
export const clearSession = async () => {
  const storage = await getAnoriStorage();
  await storage.set(anoriSchema.cloudAccount, null);
  await disconnectFromProfile(storage);
  updateApiClientToken(undefined);
};

export const isSessionError = (error: unknown): boolean => {
  return isAppErrorOfType(error, SessionExpiredError) || isAppErrorOfType(error, UnauthorizedError);
};
