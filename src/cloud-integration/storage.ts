import { anoriSchema } from "@anori/utils/storage";
import { getAnoriStorageNoWait } from "@anori/utils/storage/anori-init";

export const getCloudAccount = () => {
  const storage = getAnoriStorageNoWait();
  return storage.get(anoriSchema.latestSchema.definition.cloudAccount);
};
