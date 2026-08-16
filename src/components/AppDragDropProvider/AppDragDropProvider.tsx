import type { WidgetDragData } from "@anori/utils/dnd";
import { Feedback } from "@dnd-kit/dom";
import { DragDropProvider } from "@dnd-kit/react";
import type { ReactNode } from "react";
import { flushSync } from "react-dom";

export const AppDragDropProvider = ({ children }: { children: ReactNode }) => {
  return (
    <DragDropProvider
      plugins={(defaults) => [
        ...defaults,
        Feedback.configure({ dropAnimation: { duration: 150, easing: "ease-out" } }),
      ]}
      onDragEnd={(event) => {
        const { source, target } = event.operation;
        if (!source || source.type !== "widget" || event.canceled) return;
        if (target?.type !== "folder") return;
        const data = source.data as WidgetDragData | undefined;
        if (!data) return;
        // Commit synchronously so the widget unmounts before the Feedback plugin measures the source
        // element for its drop animation — otherwise the card visibly flies back to its old grid slot
        // and then pops out of existence once React's batched commit lands (which includes
        // actual move state update).
        flushSync(() => {
          data.onDropToFolder(String(target.id));
        });
      }}
    >
      {children}
    </DragDropProvider>
  );
};
