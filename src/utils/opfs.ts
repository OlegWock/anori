export const getDirectoryInRoot = async (name: string) => {
  const opfsRoot = await navigator.storage.getDirectory();
  const dir = await opfsRoot.getDirectoryHandle(name, { create: true });
  return dir;
};
