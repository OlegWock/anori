import "webextension-polyfill";

declare module "webextension-polyfill" {
  namespace DeclarativeNetRequest {
    interface Static {
      MAX_NUMBER_OF_DYNAMIC_AND_SESSION_RULES: number;
    }
  }

  namespace Storage {
    interface Static {
      session: StorageArea;
    }
  }
  namespace Manifest {
    interface WebExtensionManifestWebAccessibleResourcesC2ItemType {
      use_dynamic_url?: boolean;
    }

    interface WebExtensionManifest {
      optional_host_permissions?: MatchPattern[];
      browser_url_overrides?: WebExtensionManifestChromeUrlOverridesType;
    }
  }

  namespace Tabs {
    interface Static {
      group: (options: {
        createProperties?: { windowId?: number };
        groupId?: number;
        tabIds?: number | number[];
      }) => Promise<number>;
    }
  }
}

declare global {
  type FileSystemDirectoryNamesIterator = AsyncIterable<string>;
  type FileSystemDirectoryHandlesIterator = AsyncIterable<FileSystemDirectoryHandle | FileSystemFileHandle>;
  type FileSystemDirectoryEntriesIterator = AsyncIterable<[string, FileSystemDirectoryHandle | FileSystemFileHandle]>;

  interface FileSystemDirectoryHandle {
    keys(): FileSystemDirectoryNamesIterator;
    values(): FileSystemDirectoryHandlesIterator;
    entries(): FileSystemDirectoryEntriesIterator;
  }

  interface FileSystemSyncAccessHandle {
    write(buf: ArrayBuffer | ArrayBufferView, opt?: { at: number }): number; // MDN says it's actually Promise, but that seem to be typo
    flush(): void;
    close(): void;
  }

  interface FileSystemFileHandle {
    createWritable(): Promise<FileSystemWritableFileStream>;
    createSyncAccessHandle(): Promise<FileSystemSyncAccessHandle>;
  }

  type TabGroupColor = "grey" | "blue" | "red" | "yellow" | "green" | "pink" | "purple" | "cyan" | "orange";
  interface TabGroup {
    collapsed: boolean;
    color: TabGroupColor;
    id: number;
    windowId: number;
    title?: string;
  }

  interface ChromeTabGroupsStatic {
    update: (
      groupId: number,
      updateProperties: { collapsed?: boolean; color?: TabGroupColor; title?: string },
    ) => Promise<TabGroup | undefined>;
  }

  interface ChromeTabsStatic {
    group: (options: {
      createProperties?: { windowId?: number };
      groupId?: number;
      tabIds?: number | number[];
    }) => Promise<number>;
  }

  type CpuTime = {
    idle: number;
    kernel: number;
    total: number;
    user: number;
  };

  type ProcessorInfo = {
    usage: CpuTime;
  };

  type CpuInfo = {
    archName: string;
    features: ("mmx" | "sse" | "sse2" | "sse3" | "ssse3" | "sse4_1" | "sse4_2" | "avx")[];
    modelName: string;
    numOfProcessors: number;
    processors: ProcessorInfo[];
    temperatures: number[];
  };

  interface MemoryInfo {
    availableCapacity: number;
    capacity: number;
  }

  interface ChromeSystemStatic {
    cpu: {
      getInfo: () => Promise<CpuInfo>;
    };
    memory: {
      getInfo: () => Promise<MemoryInfo>;
    };
  }

  type ChromeBrowserAdditions = {
    tabGroups: ChromeTabGroupsStatic;
    tabs: ChromeTabsStatic;
    system: ChromeSystemStatic;
  };
}
