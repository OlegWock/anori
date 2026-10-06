import type { GridDimensions } from "@anori/utils/grid/types";
import { canPlaceItemInGrid } from "@anori/utils/grid/utils";
import { type AnoriTestApi, useInstallTestApi } from "@anori/utils/test-api";
import type { WidgetInFolderWithMeta } from "@anori/utils/user-data/types";
import { useMemo } from "react";
import type { LayoutChange } from "../WidgetsGrid/WidgetsGrid";

type WorkspaceTestApiParams = {
  activeFolderId: string;
  isEditing: boolean;
  setIsEditing: (enabled: boolean) => void;
  grid: GridDimensions;
  widgets: WidgetInFolderWithMeta[];
  handleLayoutUpdate: (changes: LayoutChange[]) => void;
};

export const useWorkspaceTestApi = ({
  activeFolderId,
  isEditing,
  setIsEditing,
  grid,
  widgets,
  handleLayoutUpdate,
}: WorkspaceTestApiParams) => {
  const testApi = useMemo<AnoriTestApi>(
    () => ({
      getState: () => ({
        activeFolderId,
        isEditing,
        grid,
        widgets: widgets.map(({ instanceId, pluginId, widgetId, x, y, width, height, configuration }) => ({
          instanceId,
          pluginId,
          widgetId,
          x,
          y,
          width,
          height,
          configuration,
        })),
      }),
      setEditMode: setIsEditing,
      moveWidget: (instanceId, position) => {
        const widget = widgets.find((w) => w.instanceId === instanceId);
        if (!widget) throw new Error(`No widget ${instanceId} in the active folder`);
        const canPlaceThere =
          position.x >= 0 &&
          position.y >= 0 &&
          canPlaceItemInGrid({
            grid,
            item: widget,
            layout: widgets.filter((w) => w.instanceId !== instanceId),
            position,
          });
        if (!canPlaceThere) {
          throw new Error(
            `Cannot place ${widget.widgetId} (${widget.width}x${widget.height}) at ${position.x},${position.y}`,
          );
        }
        handleLayoutUpdate([{ type: "change-position", instanceId, newPosition: position }]);
      },
    }),
    [activeFolderId, isEditing, setIsEditing, grid, widgets, handleLayoutUpdate],
  );
  useInstallTestApi(testApi);
};
