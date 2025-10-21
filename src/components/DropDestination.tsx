import { type DndItemMeta, getCurrentDraggable, useCurrentDrop } from "@anori/utils/drag-and-drop";
import {
  type JSXElementConstructor,
  type PointerEvent,
  type ReactElement,
  type Ref,
  cloneElement,
  forwardRef,
} from "react";
import { mergeRefs } from "react-merge-refs";

type ChildProps = {
  ref?: Ref<HTMLElement>;
  onPointerEnter?: (e: PointerEvent<HTMLElement>) => void;
  onPointerLeave?: (e: PointerEvent<HTMLElement>) => void;
  [key: string]: unknown;
};

type DropDestinationProps<T = unknown> = {
  type: string;
  id: string;
  children: ReactElement<ChildProps, string | JSXElementConstructor<ChildProps>>;
  filter?: string | string[];
  data?: T;
  onDragEnter?: (info: DndItemMeta) => void;
  onDragLeave?: (info: DndItemMeta, reason: "move" | "drop") => void;
  onDrop?: (info: DndItemMeta) => void;
};

export const DropDestination = forwardRef<HTMLElement, DropDestinationProps>(
  ({ type, data, filter, children, onDragEnter, onDragLeave, id, onDrop }, ref) => {
    const mergeListeners = <T extends unknown[]>(...funcs: (((...args: T) => void) | undefined)[]) => {
      return (...args: T) => {
        funcs.forEach((f) => {
          if (f) f(...args);
        });
      };
    };

    const checkAgainstFilter = (draggable: DndItemMeta | null): draggable is DndItemMeta => {
      if (!draggable) return false;
      if (!filter) return true;
      if (Array.isArray(filter)) return filter.includes(draggable.type);
      return filter === draggable.type;
    };

    const localOnDrop = (draggable: DndItemMeta) => {
      if (onDrop) onDrop(draggable);
      if (onDragLeave) onDragLeave(draggable, "drop");
    };

    const onPointerEnter = (_e: PointerEvent<HTMLElement>) => {
      const draggable = getCurrentDraggable();
      if (checkAgainstFilter(draggable)) {
        setCurrentDrop({
          type,
          data,
          id,
          onDrop: localOnDrop,
        });
        if (onDragEnter) onDragEnter(draggable);
      }
    };
    const onPointerLeave = (_e: PointerEvent<HTMLElement>) => {
      const draggable = getCurrentDraggable();
      if (checkAgainstFilter(draggable)) {
        if (currentDrop?.id === id) setCurrentDrop(null);
        if (onDragLeave) onDragLeave(draggable, "move");
      }
    };

    const [currentDrop, setCurrentDrop] = useCurrentDrop();

    return cloneElement(children, {
      ...children.props,
      ref: mergeRefs([ref, children.props.ref]),
      onPointerEnter: mergeListeners(onPointerEnter, children.props.onPointerEnter),
      onPointerLeave: mergeListeners(onPointerLeave, children.props.onPointerLeave),
    });
  },
);
