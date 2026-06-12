import { builtinIcons } from "@anori/design-system/components/Icon/builtin-icons";
import { availablePluginsWithWidgets } from "@anori/plugins/all";
import { incrementDailyUsageMetric, trackEvent } from "@anori/utils/analytics";
import type { GridDimensions, GridItemSize, GridPosition } from "@anori/utils/grid/types";
import { findPositionForItemInGrid } from "@anori/utils/grid/utils";
import { useLocationHash } from "@anori/utils/hooks";
import { guid } from "@anori/utils/misc";
import type { SomePlugin, SomeWidget } from "@anori/utils/plugins/types";
import { clearWidgetStorage } from "@anori/utils/scoped-store";
import { anoriSchema, type FolderDetails, getAnoriStorage, getAnoriStorageNoWait } from "@anori/utils/storage";
import { useStorageValue } from "@anori/utils/storage-lib";
import type { ID, Mapping } from "@anori/utils/types";
import { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { type Folder, homeFolder, type WidgetInFolder, type WidgetInFolderWithMeta } from "./types";

type UseFoldersOptions = {
  includeHome?: boolean;
  defaultFolderId?: string;
};

// Look up a widget descriptor (carrying its config parser) from the registry by its plugin/widget id.
const findWidgetDescriptor = (pluginId: string, widgetId: string): SomeWidget | undefined =>
  availablePluginsWithWidgets.find((p) => p.id === pluginId)?.widgets.find((d) => d.id === widgetId);

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
    const details = storage.get(anoriSchema.folderDetails.folder.byId(id));
    if (details) {
      for (const widget of details.widgets) {
        clearWidgetStorage(widget.instanceId);
      }
    }
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

  const [folderIdFromHash, setFolderIdInHash] = useLocationHash();

  const activeId = folderIdFromHash ?? defaultFolderId ?? homeFolder.id;
  const [folders, setFolders] = useStorageValue(anoriSchema.folders);
  const { t } = useTranslation();

  const setActiveFolder = useCallback(
    (f: ID | Folder) => {
      const id = typeof f === "string" ? f : f.id;
      if (activeId !== id) {
        incrementDailyUsageMetric("Times navigated to another folder");
      }
      setFolderIdInHash(id);
    },
    [activeId, setFolderIdInHash],
  );

  const foldersFinal = useMemo(() => {
    const result = [...folders];
    if (includeHome) result.unshift(homeFolder);
    return result;
  }, [folders, includeHome]);

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
  const currentDetails = details ?? { widgets: [] };

  const addWidget = async ({
    plugin,
    widget,
    config,
    position,
    size,
  }: {
    widget: SomeWidget;
    plugin: SomePlugin;
    config: Mapping;
    position: GridPosition;
    size?: GridItemSize;
  }) => {
    // The plugin/widget are config-erased here, so verify at runtime that the widget actually belongs to
    // the plugin before persisting the (pluginId, widgetId) pair — a mismatch would store an unresolvable widget.
    if (!plugin.widgets.some((w) => w.id === widget.id)) {
      throw new Error(`Widget "${widget.id}" does not belong to plugin "${plugin.id}"`);
    }

    // Validate (don't normalize) the config before persisting: a config-screen bug must not write a config
    // the widget can't read back, so parse throws here and aborts the write. We store the raw value, not the
    // parsed one — parse may transform (e.g. string -> Date) and storage must keep the serializable form;
    // the transform is applied at read time.
    widget.parse(config);

    const instanceId = guid();

    const data: WidgetInFolder = {
      pluginId: plugin.id,
      widgetId: widget.id,
      instanceId,
      configuration: config,
      ...(size ? size : widget.appearance.size),
      ...position,
    };

    await setDetails((p) => {
      const prev = p ?? { widgets: [] };
      return { ...prev, widgets: [...prev.widgets, data] };
    });
    trackEvent("Widget added", {
      "Folder": folder.id === "home" ? "home" : "other",
      "Plugin ID": plugin.id,
      "Widget ID": widget.id,
    });

    return data;
  };

  // Stable across renders (deps are stable: folder.id + the jotai setter). The analytics lookup reads
  // current widgets from storage rather than React state, so these don't need to depend on currentDetails.
  const removeWidget = useCallback(
    async (id: ID) => {
      clearWidgetStorage(id);
      const removedWidget = getAnoriStorageNoWait()
        .get(anoriSchema.folderDetails.folder.byId(folder.id))
        ?.widgets.find((w) => w.instanceId === id);
      if (removedWidget) {
        trackEvent("Widget removed", {
          "Folder": folder.id === "home" ? "home" : "other",
          "Plugin ID": removedWidget.pluginId,
          "Widget ID": removedWidget.widgetId,
        });
      }
      await setDetails((p) => {
        const prev = p ?? { widgets: [] };
        return { ...prev, widgets: prev.widgets.filter((w) => w.instanceId !== id) };
      });
    },
    [folder.id, setDetails],
  );

  const moveWidget = useCallback(
    async (id: ID, position: GridPosition) => {
      const movedWidget = getAnoriStorageNoWait()
        .get(anoriSchema.folderDetails.folder.byId(folder.id))
        ?.widgets.find((w) => w.instanceId === id);
      if (movedWidget) {
        trackEvent("Widget moved", {
          "Folder": folder.id === "home" ? "home" : "other",
          "To another folder": false,
          "Plugin ID": movedWidget.pluginId,
          "Widget ID": movedWidget.widgetId,
        });
      }
      await setDetails((p) => {
        const prev = p ?? { widgets: [] };
        return {
          ...prev,
          widgets: prev.widgets.map((w) => {
            if (w.instanceId === id) {
              return { ...w, ...position };
            }
            return w;
          }),
        };
      });
    },
    [folder.id, setDetails],
  );

  const resizeWidget = useCallback(
    async (id: ID, size: GridItemSize) => {
      const resizedWidget = getAnoriStorageNoWait()
        .get(anoriSchema.folderDetails.folder.byId(folder.id))
        ?.widgets.find((w) => w.instanceId === id);
      if (resizedWidget) {
        trackEvent("Widget resized", {
          "Folder": folder.id === "home" ? "home" : "other",
          "Plugin ID": resizedWidget.pluginId,
          "Widget ID": resizedWidget.widgetId,
        });
      }
      await setDetails((p) => {
        const prev = p ?? { widgets: [] };
        return {
          ...prev,
          widgets: prev.widgets.map((w) => {
            if (w.instanceId === id) {
              return { ...w, width: size.width, height: size.height };
            }
            return w;
          }),
        };
      });
    },
    [folder.id, setDetails],
  );

  // Stable across renders (deps are stable) so consumers — and the widget metadata context that exposes
  // it — don't churn. The analytics lookup reads current widgets from storage rather than React state.
  const updateWidgetConfig = useCallback(
    async (id: ID, newConfig: Mapping) => {
      const updatedWidget = getAnoriStorageNoWait()
        .get(anoriSchema.folderDetails.folder.byId(folder.id))
        ?.widgets.find((w) => w.instanceId === id);
      if (!updatedWidget) return;

      // Edits are partial, so validate the *merged* result is parseable — aborting the write if a
      // config-screen bug produced something the widget can't read back. Store the raw merged value, not the
      // parsed one (parse may transform, e.g. string -> Date; storage keeps the serializable form and the
      // transform is applied at read time).
      const configuration = { ...updatedWidget.configuration, ...newConfig };
      findWidgetDescriptor(updatedWidget.pluginId, updatedWidget.widgetId)?.parse(configuration);

      trackEvent("Widget configuration edited", {
        "Folder": folder.id === "home" ? "home" : "other",
        "Plugin ID": updatedWidget.pluginId,
        "Widget ID": updatedWidget.widgetId,
      });

      await setDetails((p) => {
        const prev = p ?? { widgets: [] };
        return {
          ...prev,
          widgets: prev.widgets.map((w) => (w.instanceId === id ? { ...w, configuration } : w)),
        };
      });
    },
    [folder.id, setDetails],
  );

  const widgets: WidgetInFolderWithMeta[] = useMemo(
    () =>
      currentDetails.widgets
        .filter((w) => {
          const plugin = availablePluginsWithWidgets.find((p) => p.id === w.pluginId);
          if (!plugin) return false;
          return !!plugin.widgets.flat().find((d) => d.id === w.widgetId);
        })
        .map((w) => {
          const plugin = availablePluginsWithWidgets.find((p) => p.id === w.pluginId) as SomePlugin;
          const widget = plugin.widgets.find((d) => d.id === w.widgetId) as SomeWidget;

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
