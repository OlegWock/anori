import { availablePluginsWithWidgets } from "@anori/plugins/all";
import { incrementDailyUsageMetric, trackEvent } from "@anori/utils/analytics";
import { builtinIcons } from "@anori/utils/builtin-icons";
import { type GridDimensions, type LayoutItemSize, type Position, findPositionForItemInGrid } from "@anori/utils/grid";
import { useLocationHash } from "@anori/utils/hooks";
import { guid } from "@anori/utils/misc";
import { NamespacedStorage } from "@anori/utils/namespaced-storage";
import {
  type AtomWithBrowserStorage,
  atomWithBrowserStorage,
  setAtomWithStorageValue,
  storage,
  useAtomWithStorage,
  useBrowserStorageValue,
} from "@anori/utils/storage/api";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import browser from "webextension-polyfill";
import {
  type AnoriPlugin,
  type Folder,
  type FolderDetailsInStorage,
  type ID,
  type WidgetDescriptor,
  type WidgetInFolder,
  type WidgetInFolderWithMeta,
  homeFolder,
} from "./types";

type UseFoldersOptions = {
  includeHome?: boolean;
  defaultFolderId?: string;
};

export const useFolders = ({ includeHome = false, defaultFolderId }: UseFoldersOptions = {}) => {
  const createFolder = (name = "", icon = builtinIcons.folder) => {
    const newFolder = {
      id: guid(),
      name: name || t("settings.folders.defaultName"),
      icon,
    };
    setFolders((p) => [...p, newFolder]);
    trackEvent("Folder created");
    return newFolder;
  };

  const removeFolder = (id: ID) => {
    const atom = getFolderDetailsAtom(id);
    setAtomWithStorageValue(atom, { widgets: [] });
    setTimeout(() => {
      browser.storage.local.remove(`Folder.${id}`);
    }, 0);
    trackEvent("Folder deleted");
    setFolders((p) => p.filter((f) => f.id !== id));
  };

  const updateFolder = (id: ID, update: Partial<Omit<Folder, "id">>) => {
    setFolders((p) =>
      p.map((f) => {
        if (f.id === id) {
          return {
            ...f,
            ...update,
          };
        }
        return f;
      }),
    );
  };

  const changeFolderPosition = (id: ID, moveTo: number) => {
    setFolders((p) => {
      const copy = [...p];
      const currentIndex = copy.findIndex((f) => f.id === id);
      if (currentIndex === -1 || moveTo === currentIndex) return copy;

      const [folder] = copy.splice(currentIndex, 1);
      const newIndex = moveTo > currentIndex ? moveTo - 1 : moveTo;
      copy.splice(newIndex, 0, folder);
      return copy;
    });
  };

  const setActiveFolder = (f: ID | Folder) => {
    const id = typeof f === "string" ? f : f.id;
    if (activeId !== id) {
      incrementDailyUsageMetric("Times navigated to another folder");
    }
    setFolderIdInHash(id);
  };

  const [folderIdFromHash, setFolderIdInHash] = useLocationHash();

  const activeId = folderIdFromHash ?? defaultFolderId ?? homeFolder.id;
  const [folders, setFolders] = useBrowserStorageValue("folders", []);
  const { t } = useTranslation();
  const foldersFinal = [...folders];
  if (includeHome) {
    foldersFinal.unshift(homeFolder);
  }

  const activeFolder = (activeId === homeFolder.id ? homeFolder : folders.find((f) => f.id === activeId)) || homeFolder;

  return {
    folders: foldersFinal,
    activeFolder,
    setActiveFolder,
    setFolders,
    createFolder,
    updateFolder,
    changeFolderPosition,
    removeFolder,
  };
};

const folderDetailsAtoms: Record<ID, AtomWithBrowserStorage<FolderDetailsInStorage>> = {};
const getFolderDetailsAtom = (id: ID) => {
  if (!folderDetailsAtoms[id]) {
    folderDetailsAtoms[id] = atomWithBrowserStorage<FolderDetailsInStorage>(`Folder.${id}`, {
      widgets: [],
    } satisfies FolderDetailsInStorage);
  }

  return folderDetailsAtoms[id];
};

export const getFolderDetails = async (id: ID) => {
  return (await storage.getOneDynamic<FolderDetailsInStorage>(`Folder.${id}`)) || { widgets: [] };
};

export const setFolderDetails = async (id: ID, details: FolderDetailsInStorage) => {
  return await storage.setOneDynamic<FolderDetailsInStorage>(`Folder.${id}`, details);
};

export const useFolderWidgets = (folder: Folder) => {
  const addWidget = <T extends {}>({
    plugin,
    widget,
    config,
    position,
    size,
  }: {
    widget: WidgetDescriptor<T>;
    plugin: AnoriPlugin<any, T>;
    config: T;
    position: Position;
    size?: LayoutItemSize;
  }) => {
    const instanceId = guid();

    const data: WidgetInFolder<T> = {
      pluginId: plugin.id,
      widgetId: widget.id,
      instanceId,
      configuration: config,
      ...(size ? size : widget.appearance.size),
      ...position,
    };

    setDetails((p) => {
      return {
        ...p,
        widgets: [...p.widgets, data],
      };
    });
    trackEvent("Widget added", {
      "Folder": folder.id === "home" ? "home" : "other",
      "Plugin ID": plugin.id,
      "Widget ID": widget.id,
    });

    return data;
  };

  const removeWidget = (widgetOrId: WidgetInFolder<any> | ID) => {
    const id = typeof widgetOrId === "string" ? widgetOrId : widgetOrId.instanceId;
    NamespacedStorage.get(`WidgetStorage.${id}`).clear();
    const removedWidget = details.widgets.find((w) => w.instanceId === id);
    if (removedWidget) {
      trackEvent("Widget removed", {
        "Folder": folder.id === "home" ? "home" : "other",
        "Plugin ID": removedWidget.pluginId,
        "Widget ID": removedWidget.widgetId,
      });
    }
    setDetails((p) => {
      return {
        ...p,
        widgets: p.widgets.filter((w) => w.instanceId !== id),
      };
    });
  };

  const moveWidget = (widgetOrId: WidgetInFolder<any> | ID, position: Position) => {
    const id = typeof widgetOrId === "string" ? widgetOrId : widgetOrId.instanceId;
    const movedWidget = details.widgets.find((w) => w.instanceId === id);
    if (movedWidget) {
      trackEvent("Widget moved", {
        "Folder": folder.id === "home" ? "home" : "other",
        "To another folder": false,
        "Plugin ID": movedWidget.pluginId,
        "Widget ID": movedWidget.widgetId,
      });
    }
    setDetails((p) => {
      return {
        ...p,
        widgets: p.widgets.map((w) => {
          if (w.instanceId === id) {
            return {
              ...w,
              ...position,
            };
          }
          return w;
        }),
      };
    });
  };

  const resizeWidget = (widgetOrId: WidgetInFolder<any> | ID, size: LayoutItemSize) => {
    const id = typeof widgetOrId === "string" ? widgetOrId : widgetOrId.instanceId;
    const resizedWidget = details.widgets.find((w) => w.instanceId === id);
    if (resizedWidget) {
      trackEvent("Widget resized", {
        "Folder": folder.id === "home" ? "home" : "other",
        "Plugin ID": resizedWidget.pluginId,
        "Widget ID": resizedWidget.widgetId,
      });
    }
    setDetails((p) => {
      return {
        ...p,
        widgets: p.widgets.map((w) => {
          if (w.instanceId === id) {
            return {
              ...w,
              width: size.width,
              height: size.height,
            };
          }
          return w;
        }),
      };
    });
  };

  const updateWidgetConfig = <T extends {}>(widgetOrId: WidgetInFolder<T> | ID, newConfig: T) => {
    const id = typeof widgetOrId === "string" ? widgetOrId : widgetOrId.instanceId;
    const updatedWidget = details.widgets.find((w) => w.instanceId === id);
    if (updatedWidget) {
      trackEvent("Widget configuration edited", {
        "Folder": folder.id === "home" ? "home" : "other",
        "Plugin ID": updatedWidget.pluginId,
        "Widget ID": updatedWidget.widgetId,
      });
    }
    setDetails((p) => {
      return {
        ...p,
        widgets: p.widgets.map((w) => {
          if (w.instanceId === id) {
            return {
              ...w,
              configuration: {
                ...w.configuration,
                ...newConfig,
              },
            };
          }
          return w;
        }),
      };
    });
  };

  const atom = useMemo(() => getFolderDetailsAtom(folder.id), [folder]);
  const [details, setDetails, meta] = useAtomWithStorage(atom);

  const widgets: WidgetInFolderWithMeta<any, any, any>[] = useMemo(
    () =>
      details.widgets
        .filter((w) => {
          const plugin = availablePluginsWithWidgets.find((p) => p.id === w.pluginId);
          if (!plugin) return false;
          return !!plugin.widgets.flat().find((d) => d.id === w.widgetId);
        })
        .map((w) => {
          const plugin = availablePluginsWithWidgets.find((p) => p.id === w.pluginId) as AnoriPlugin;
          const widget = plugin.widgets.flat().find((d) => d.id === w.widgetId) as WidgetDescriptor;

          return {
            ...w,
            widget,
            plugin,
          };
        }),
    [details.widgets],
  );

  return {
    widgets,
    addWidget,
    removeWidget,
    moveWidget,
    resizeWidget,
    updateWidgetConfig,
    folderDataLoaded: meta.status !== "notLoaded",
  };
};

export const tryMoveWidgetToFolder = async (
  folderIdFrom: Folder["id"],
  folderIdTo: Folder["id"],
  widgetInstanceId: WidgetInFolderWithMeta<any, any, any>["instanceId"],
  currentGrid: GridDimensions,
) => {
  const fromFolderDetails = await getFolderDetails(folderIdFrom);
  const toFolderDetails = await getFolderDetails(folderIdTo);
  const widgetInfo = fromFolderDetails.widgets.find((w) => w.instanceId === widgetInstanceId);
  if (!widgetInfo) return false;

  const toFolderLayout = toFolderDetails.widgets;
  let newPosition = findPositionForItemInGrid({ grid: currentGrid, layout: toFolderLayout, item: widgetInfo });
  if (!newPosition) {
    const numberOfColumns = Math.max(...toFolderLayout.map((w) => w.x + w.width), 0);
    newPosition = {
      x: numberOfColumns,
      y: 0,
    };
  }

  fromFolderDetails.widgets = fromFolderDetails.widgets.filter((w) => w.instanceId !== widgetInstanceId);
  toFolderDetails.widgets = [
    ...toFolderDetails.widgets,
    {
      ...widgetInfo,
      ...newPosition,
    },
  ];

  await setFolderDetails(folderIdTo, toFolderDetails);
  await setFolderDetails(folderIdFrom, fromFolderDetails);

  trackEvent("Widget moved", {
    "Folder": folderIdFrom === "home" ? "home" : "other",
    "To another folder": true,
    "Plugin ID": widgetInfo.pluginId,
    "Widget ID": widgetInfo.widgetId,
  });

  return true;
};
