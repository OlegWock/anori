import { type DndItemMeta, getCurrentDraggable, useCurrentDrop } from "@anori/utils/drag-and-drop";
import { cloneElement, type JSXElementConstructor, type PointerEvent, type ReactElement, type Ref } from "react";
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
  ref?: Ref<HTMLElement>;
  [key: string]: unknown;
};

export const DropDestination = ({
  type,
  data,
  filter,
  children,
  onDragEnter,
  onDragLeave,
  id,
  onDrop,
  ref,
  ...rest
}: DropDestinationProps) => {
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

  // Merge what a wrapper injected (e.g. a Tooltip trigger's data attributes + handlers) with the child's
  // own props. Spread `extra` first so the child's plain props (className, etc.) win, then chain the
  // event handlers so neither side clobbers the other — otherwise the trigger's onClick/onPointerDown
  // would shadow the child's (e.g. a folder button's click).
  const extra = rest as ChildProps;
  const asHandler = (fn: unknown) => (typeof fn === "function" ? (fn as (...args: unknown[]) => void) : undefined);
  return cloneElement(children, {
    ...extra,
    ...children.props,
    ref: mergeRefs([ref, children.props.ref]),
    onClick: mergeListeners(asHandler(extra.onClick), asHandler(children.props.onClick)),
    onPointerDown: mergeListeners(asHandler(extra.onPointerDown), asHandler(children.props.onPointerDown)),
    onPointerEnter: mergeListeners(onPointerEnter, extra.onPointerEnter, children.props.onPointerEnter),
    onPointerLeave: mergeListeners(onPointerLeave, extra.onPointerLeave, children.props.onPointerLeave),
  });
};
