import type { AnoriStorage } from "@anori/utils/storage/init";
import { useStorage } from "@anori/utils/storage-lib";

export function useAnoriStorage() {
  const storage = useStorage();
  return storage as AnoriStorage;
}
