import { useStorage } from "@anori/utils/storage-lib";
import type { AnoriStorage } from "@anori/utils/storage/init";

export function useAnoriStorage() {
  const storage = useStorage();
  return storage as AnoriStorage;
}
