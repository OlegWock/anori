import { guid } from "@anori/utils/misc";
import { anoriSchema, getAnoriStorage } from "@anori/utils/storage";

export async function getOrCreateDeviceId(): Promise<string> {
  const storage = await getAnoriStorage();
  const existing = storage.get(anoriSchema.deviceId);
  if (existing) return existing;

  const deviceId = guid();
  await storage.set(anoriSchema.deviceId, deviceId);
  return deviceId;
}
