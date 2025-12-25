import { anoriSchema, getAnoriStorageNoWait } from "@anori/utils/storage";

export const getCloudAccount = () => {
  const storage = getAnoriStorageNoWait();
  return storage.get(anoriSchema.cloudAccount);
};
