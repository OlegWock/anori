import { builtinIcons } from "@anori/components/icon/builtin-icons";
import { availablePluginsWithWidgets } from "@anori/plugins/all";
import { incrementDailyUsageMetric, trackEvent } from "@anori/utils/analytics";
import type { GridDimensions, GridItemSize, GridPosition } from "@anori/utils/grid/types";
import { findPositionForItemInGrid } from "@anori/utils/grid/utils";
import { useLocationHash } from "@anori/utils/hooks";
import { guid } from "@anori/utils/misc";
import type {
  AnoriPlugin,
  ConfigFromWidgetDescriptor,
  IDFromWidgetDescriptor,
  WidgetDescriptor,
} from "@anori/utils/plugins/types";
import { clearWidgetStorage } from "@anori/utils/scoped-store";
import { type FolderDetails, anoriSchema, getAnoriStorage, getAnoriStorageNoWait } from "@anori/utils/storage";
import { useStorageValue } from "@anori/utils/storage-lib";
import type { ID, Mapping } from "@anori/utils/types";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { type Folder, type WidgetInFolder, type WidgetInFolderWithMeta, homeFolder } from "./types";

type UseFoldersOptions = {
  includeHome?: boolean;
  defaultFolderId?: string;
};

export const useFolders = ({ includeHome = false, defaultFolderId }: UseFoldersOptions = {}) => {
  const createFolder = async (name = "", icon = builtinIcons.folder) => {
    const newFolder = {
      id: guid(),
      name: name || t("settings.folders.defaultName"),
      icon,
    };
    await setFolders((p) => [...p, newFolder]);
    trackEvent("Folder created");
    return newFolder;
  };

  const removeFolder = async (id: ID) => {
    const storage = await getAnoriStorage();
    await storage.delete(anoriSchema.folderDetails.folder.byId(id));
    trackEvent("Folder deleted");
    await setFolders((p) => p.filter((f) => f.id !== id));
  };

  const updateFolder = async (id: ID, update: Partial<Omit<Folder, "id">>) => {
    await setFolders((p) =>
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

  const changeFolderPosition = async (id: ID, moveTo: number) => {
    await setFolders((p) => {
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
  const [folders, setFolders] = useStorageValue(anoriSchema.folders);
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

export const getFolderDetails = async (id: ID): Promise<FolderDetails> => {
  const storage = await getAnoriStorage();
  return storage.get(anoriSchema.folderDetails.folder.byId(id)) ?? { widgets: [] };
};

export const setFolderDetails = async (id: ID, details: FolderDetails): Promise<void> => {
  const storage = await getAnoriStorage();
  await storage.set(anoriSchema.folderDetails.folder.byId(id), details);
};

export const useFolderWidgets = (folder: Folder) => {
  const [details, setDetails] = useStorageValue(anoriSchema.folderDetails.folder.byId(folder.id));
  console.log(
    "Folder",
    folder.id,
    folder.name,
    "details",
    getAnoriStorageNoWait().get(anoriSchema.folderDetails.folder.byId(folder.id)),
  );
  const currentDetails = details ?? { widgets: [] };

  const addWidget = async <WD extends WidgetDescriptor[], W extends WD[number]>({
    plugin,
    widget,
    config,
    position,
    size,
  }: {
    widget: W;
    plugin: AnoriPlugin<string, Mapping, WD>;
    config: ConfigFromWidgetDescriptor<W>;
    position: GridPosition;
    size?: GridItemSize;
  }) => {
    const instanceId = guid();

    const data: WidgetInFolder<ID, WD, W> = {
      pluginId: plugin.id,
      widgetId: widget.id as IDFromWidgetDescriptor<W>,
      instanceId,
      configuration: config,
      ...(size ? size : widget.appearance.size),
      ...position,
    };

    await setDetails((p) => ({
      ...p,
      widgets: [...p.widgets, data],
    }));
    trackEvent("Widget added", {
      "Folder": folder.id === "home" ? "home" : "other",
      "Plugin ID": plugin.id,
      "Widget ID": widget.id,
    });

    return data;
  };

  const removeWidget = async (id: ID) => {
    clearWidgetStorage(id);
    const removedWidget = currentDetails.widgets.find((w) => w.instanceId === id);
    if (removedWidget) {
      trackEvent("Widget removed", {
        "Folder": folder.id === "home" ? "home" : "other",
        "Plugin ID": removedWidget.pluginId,
        "Widget ID": removedWidget.widgetId,
      });
    }
    await setDetails((p) => ({
      ...p,
      widgets: p.widgets.filter((w) => w.instanceId !== id),
    }));
  };

  const moveWidget = async (id: ID, position: GridPosition) => {
    const movedWidget = currentDetails.widgets.find((w) => w.instanceId === id);
    if (movedWidget) {
      trackEvent("Widget moved", {
        "Folder": folder.id === "home" ? "home" : "other",
        "To another folder": false,
        "Plugin ID": movedWidget.pluginId,
        "Widget ID": movedWidget.widgetId,
      });
    }
    await setDetails((p) => ({
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
    }));
  };

  const resizeWidget = async (id: ID, size: GridItemSize) => {
    const resizedWidget = currentDetails.widgets.find((w) => w.instanceId === id);
    if (resizedWidget) {
      trackEvent("Widget resized", {
        "Folder": folder.id === "home" ? "home" : "other",
        "Plugin ID": resizedWidget.pluginId,
        "Widget ID": resizedWidget.widgetId,
      });
    }
    await setDetails((p) => ({
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
    }));
  };

  const updateWidgetConfig = async (id: ID, newConfig: Mapping) => {
    const updatedWidget = currentDetails.widgets.find((w) => w.instanceId === id);
    if (updatedWidget) {
      trackEvent("Widget configuration edited", {
        "Folder": folder.id === "home" ? "home" : "other",
        "Plugin ID": updatedWidget.pluginId,
        "Widget ID": updatedWidget.widgetId,
      });
    }
    await setDetails((p) => ({
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
    }));
  };

  const widgets: WidgetInFolderWithMeta[] = useMemo(
    () =>
      currentDetails.widgets
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
    [currentDetails.widgets],
  );

  return {
    widgets,
    addWidget,
    removeWidget,
    moveWidget,
    resizeWidget,
    updateWidgetConfig,
    folderDataLoaded: details !== undefined,
  };
};

export const tryMoveWidgetToFolder = async (
  folderIdFrom: Folder["id"],
  folderIdTo: Folder["id"],
  widgetInstanceId: WidgetInFolderWithMeta["instanceId"],
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

  const updatedFromDetails = {
    ...fromFolderDetails,
    widgets: fromFolderDetails.widgets.filter((w) => w.instanceId !== widgetInstanceId),
  };
  const updatedToDetails = {
    ...toFolderDetails,
    widgets: [
      ...toFolderDetails.widgets,
      {
        ...widgetInfo,
        ...newPosition,
      },
    ],
  };

  await setFolderDetails(folderIdTo, updatedToDetails);
  await setFolderDetails(folderIdFrom, updatedFromDetails);

  trackEvent("Widget moved", {
    "Folder": folderIdFrom === "home" ? "home" : "other",
    "To another folder": true,
    "Plugin ID": widgetInfo.pluginId,
    "Widget ID": widgetInfo.widgetId,
  });

  return true;
};
