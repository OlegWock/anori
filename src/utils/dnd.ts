import { useDragDropMonitor } from "@dnd-kit/react";
import { useState } from "react";

export type WidgetDragData = {
  onDropToFolder: (folderId: string) => void;
};

export const useWidgetDragActive = () => {
  const [active, setActive] = useState(false);
  useDragDropMonitor({
    onDragStart(event) {
      if (event.operation.source?.type === "widget") setActive(true);
    },
    onDragEnd() {
      setActive(false);
    },
  });
  return active;
};
