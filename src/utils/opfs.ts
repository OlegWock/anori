export const OPFS_AVAILABLE = (() => {
  if (typeof window === "undefined") return true;
  if (navigator.userAgent.includes("Firefox/")) {
    const version = Number.parseInt(navigator.userAgent.split("Firefox/")[1].split(".")[0]);
    return version >= 111;
  }

  return true;
})();

export const getDirectoryInRoot = async (name: string) => {
  const opfsRoot = await navigator.storage.getDirectory();
  const dir = await opfsRoot.getDirectoryHandle(name, { create: true });
  return dir;
};
