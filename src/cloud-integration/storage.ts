import { anoriSchema } from "@anori/utils/storage";
import { getAnoriStorageNoWait } from "@anori/utils/storage/anori-init";
import { atomWithStorageQuery } from "@anori/utils/storage/react";

export const cloudAccountAtom = atomWithStorageQuery(anoriSchema.latestSchema.definition.cloudAccount);

export const getCloudAccount = () => {
  const storage = getAnoriStorageNoWait();
  return storage.get(anoriSchema.latestSchema.definition.cloudAccount);
};
