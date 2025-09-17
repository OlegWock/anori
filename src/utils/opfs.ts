export const getDirectoryInRoot = async (name: string) => {
  const opfsRoot = await navigator.storage.getDirectory();
  const dir = await opfsRoot.getDirectoryHandle(name, { create: true });
  return dir;
};

export const OPFS_TEMP_FOLDER_NAME = "tmp";

export const getTemporaryDirectory = async (name: string) => {
  const tmp = await getDirectoryInRoot(OPFS_TEMP_FOLDER_NAME);
  const dir = await tmp.getDirectoryHandle(name, { create: true });
  return dir;
};
