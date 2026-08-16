import { anoriSchema, getAnoriStorage } from "@anori/utils/storage";
import { getApiClient } from "./api-client";
import { getOrCreateDeviceId } from "./device-id";
import { getBrowser, getDeviceName, getOS } from "./device-name";

/**
 * Registers this device with the backend and binds the current session to it. Idempotent and
 * deduplicated per account via a local marker, so it runs at most once per account: it exists so
 * sessions signed in before device tracking (no deviceId sent at login) still get a device without
 * forcing a re-login. Fresh logins already bind their device at login time.
 */
export async function ensureDeviceRegistered(): Promise<void> {
  try {
    const storage = await getAnoriStorage();
    const account = storage.get(anoriSchema.cloudAccount);
    if (!account) return;
    if (storage.get(anoriSchema.deviceRegisteredForUserId) === account.userId) return;

    const deviceId = await getOrCreateDeviceId();
    await getApiClient().auth.registerDevice.mutate({
      deviceId,
      deviceName: getDeviceName(),
      browser: getBrowser(),
      os: getOS(),
    });
    await storage.set(anoriSchema.deviceRegisteredForUserId, account.userId);
  } catch (err) {
    console.error("Failed to register device", err);
  }
}
