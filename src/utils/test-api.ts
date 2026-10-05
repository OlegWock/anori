import type { GridDimensions } from "@anori/utils/grid/types";
import { useEffect } from "react";

export type TestApiWidget = {
  instanceId: string;
  pluginId: string;
  widgetId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  configuration: Record<string, unknown>;
};

export type TestApiState = {
  activeFolderId: string;
  isEditing: boolean;
  grid: GridDimensions;
  widgets: TestApiWidget[];
};

export type AnoriTestApi = {
  getState: () => TestApiState;
  setEditMode: (enabled: boolean) => void;
};

declare global {
  interface Window {
    __anoriTestApi?: AnoriTestApi;
  }
}

export const useInstallTestApi = (api: AnoriTestApi) => {
  useEffect(() => {
    if (X_MODE !== "development") return;
    window.__anoriTestApi = api;
    return () => {
      if (window.__anoriTestApi === api) delete window.__anoriTestApi;
    };
  }, [api]);
};
