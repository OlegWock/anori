import type { Mode } from "@rspack/core";
import type { Manifest } from "webextension-polyfill";
import packageJson from "../package.json" with { type: "json" };
import type { TargetBrowser } from "./types";
import type { createPathsObject } from "./utils";

export const generateManifest = (
  mode: Mode,
  targetBrowser: TargetBrowser,
  paths: ReturnType<typeof createPathsObject>,
): Manifest.WebExtensionManifest => {
  const manifest: Manifest.WebExtensionManifest = {
    name: "__MSG_appName__",
    description: "__MSG_appDescription__",
    version: packageJson.version,
    author: packageJson.author,
    manifest_version: 3,
    default_locale: "en",
    action: {
      default_title: "__MSG_appActionTitle__",
    },
    minimum_chrome_version: "104",
    background: {
      service_worker: "background-wrapper.js",
    },
    icons: {
      "48": "assets/images/icon48.png",
      "128": "assets/images/icon128.png",
    },
    permissions: ["alarms", "storage", "unlimitedStorage", "sessions", "system.cpu", "system.memory"],
    host_permissions: [] as string[],
    optional_permissions: [
      "tabs",
      "favicon",
      "topSites",
      "bookmarks",
      "tabGroups",
      "declarativeNetRequestWithHostAccess",
      "browsingData",
    ],
    optional_host_permissions: ["*://*/*"],

    chrome_url_overrides: {
      newtab: "/pages/newtab/start.html",
    },
    web_accessible_resources: [
      {
        resources: [`/${paths.dist.assets}/*`],
        matches: ["<all_urls>"],
        use_dynamic_url: true,
      },
      {
        resources: [`/${paths.dist.chunks}/*`],
        matches: ["<all_urls>"],
        use_dynamic_url: true,
      },
    ],
  };

  if (mode === "development") {
    manifest.permissions?.push("declarativeNetRequestFeedback");
  }

  if (targetBrowser === "chrome-all-permissions") {
    manifest.permissions = [...(manifest.permissions ?? []), ...(manifest.optional_permissions ?? [])];
    manifest.optional_permissions = [];

    manifest.host_permissions = [...(manifest.host_permissions ?? []), ...(manifest.optional_host_permissions ?? [])];
    manifest.optional_host_permissions = [];
  }

  // Chrome (with manifest v3) treated as default platform. So, need to patch it for Firefox manifest v2
  if (targetBrowser === "firefox") {
    const unavailablePermissions = [
      "system.cpu",
      "system.memory",
      "favicon",
      "tabGroups",
      "declarativeNetRequestWithHostAccess",
    ];

    const additionalPermissions: string[] = [];

    manifest.manifest_version = 2;

    manifest.browser_action = manifest.action;
    manifest.action = undefined;

    manifest.host_permissions = undefined;
    manifest.minimum_chrome_version = undefined;

    manifest.optional_permissions = [
      ...(manifest.optional_permissions ?? []),
      ...(manifest.optional_host_permissions ?? []),
    ];

    manifest.optional_host_permissions = undefined;

    manifest.permissions = [
      ...(manifest.permissions?.filter((p) => !unavailablePermissions.includes(p)) ?? []),
      ...additionalPermissions,
    ];
    manifest.optional_permissions = manifest.optional_permissions?.filter((p) => !unavailablePermissions.includes(p));

    manifest.background = {
      persistent: false,
      scripts: ["background.js"],
    };

    manifest.web_accessible_resources = manifest.web_accessible_resources?.flatMap((descriptor) => {
      return (descriptor as Manifest.WebExtensionManifestWebAccessibleResourcesC2ItemType).resources;
    });

    if (targetBrowser === "firefox") {
      manifest.browser_specific_settings = {
        gecko: {
          strict_min_version: "111.0",
        },
      };
    }
  }

  if (targetBrowser === "firefox") {
    manifest.optional_permissions?.push("webRequest", "webRequestBlocking");

    // Despite the name this seem to work only in Firefox (for Chrome new tab page and home page are the same)
    manifest.chrome_settings_overrides = {
      homepage: "pages/newtab/start.html",
    };
  }

  return manifest;
};
