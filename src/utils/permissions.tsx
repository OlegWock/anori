import { detectBrowser } from "@anori/utils/browser";
import { atom, getDefaultStore, useAtomValue } from "jotai";
import browser, { type Manifest } from "webextension-polyfill";

export type CorrectPermission =
  | Manifest.OptionalPermission
  | "tabGroups"
  | "favicon"
  | "declarativeNetRequestWithHostAccess";

export const ALL_HOSTS_WILDCARD = "*://*/*";

export const availablePermissionsAtom = atom<null | { hosts: string[]; permissions: CorrectPermission[] }>(null);

export const containsHostPermission = (hostPermissions: string[], host: string) => {
  const hasAllSitesPermission = hostPermissions.includes(ALL_HOSTS_WILDCARD);
  return (
    hasAllSitesPermission ||
    hostPermissions.some((grantedHost) => grantedHost.toLowerCase().includes(normalizeHost(host)))
  );
};

export const normalizeHost = (host: string) => {
  if (host === ALL_HOSTS_WILDCARD) {
    return host;
  }

  let correctedHost = host;
  if (correctedHost.includes("://")) correctedHost = correctedHost.split("://")[1];
  if (correctedHost.includes("/")) correctedHost = correctedHost.split("/")[0];
  return correctedHost.toLowerCase();
};

export const updateAvailablePermissions = async () => {
  const current = await browser.permissions.getAll();
  const atomStore = getDefaultStore();
  atomStore.set(availablePermissionsAtom, {
    permissions: (current.permissions as CorrectPermission[]) || [],
    hosts: current.origins || [],
  });
};

export const watchForPermissionChanges = async () => {
  const current = await browser.permissions.getAll();
  const atomStore = getDefaultStore();
  atomStore.set(availablePermissionsAtom, {
    permissions: (current.permissions as CorrectPermission[]) || [],
    hosts: current.origins || [],
  });

  browser.permissions.onAdded.addListener((addedPermissions) => {
    const currentPermissions = atomStore.get(availablePermissionsAtom);
    if (!currentPermissions) return;
    const newPermissions = {
      permissions: [...currentPermissions.permissions, ...(addedPermissions.permissions || [])],
      hosts: [...currentPermissions.hosts, ...(addedPermissions.origins || [])],
    };
    atomStore.set(availablePermissionsAtom, newPermissions);
  });
  browser.permissions.onAdded.addListener((removedPermissions) => {
    const currentPermissions = atomStore.get(availablePermissionsAtom);
    if (!currentPermissions) return;
    const newPermissions = {
      permissions: currentPermissions.permissions.filter(
        (p) => !((removedPermissions.permissions || []) as CorrectPermission[]).includes(p),
      ),
      hosts: currentPermissions.hosts.filter((p) => !(removedPermissions.origins || []).includes(p)),
    };
    atomStore.set(availablePermissionsAtom, newPermissions);
  });
};

export const isPermissionSupported = (permission: string) => {
  const browser = detectBrowser();
  if (browser === "Firefox") {
    // declarativeNetRequestWithHostAccess is available, but Anori doesn't use it in Firefox
    return !["favicon", "declarativeNetRequestWithHostAccess"].includes(permission);
  }
  if (browser === "Opera") {
    // Opera doesn't support favicon for some reason (+ webRequest not supported by Chromium browsers in general)
    return !["favicon", "webRequest", "webRequestBlocking"].includes(permission);
  }
  return !["webRequest", "webRequestBlocking"].includes(permission);
};

export const useAvailablePermissions = () => {
  const currentPermissions = useAtomValue(availablePermissionsAtom);
  return currentPermissions || { hosts: [], permissions: [] };
};

export const usePermissionsQuery = ({
  hosts,
  permissions,
}: { hosts?: string[]; permissions?: CorrectPermission[] }) => {
  const availablePermissions = useAvailablePermissions();
  const missingPermissions = permissions
    ? permissions.filter((p) => !availablePermissions.permissions.includes(p)).filter((p) => isPermissionSupported(p))
    : [];
  const missingHostPermissions = hosts
    ? hosts.filter((h) => !containsHostPermission(availablePermissions.hosts, h))
    : [];

  return missingPermissions.length === 0 && missingHostPermissions.length === 0;
};
