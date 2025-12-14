import { atomWithBrowserStorageStatic, getAtomWithStorageValue } from "@anori/utils/storage/api";

export const cloudAccountAtom = atomWithBrowserStorageStatic("cloudAccount", null);

export const getCloudAccount = () => {
  const { value } = getAtomWithStorageValue(cloudAccountAtom);
  return value;
};
