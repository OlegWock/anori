import { RestrictToVerticalAxis } from "@dnd-kit/abstract/modifiers";
import { RestrictToElement } from "@dnd-kit/dom/modifiers";
import { move } from "@dnd-kit/helpers";
import { useDragDropMonitor } from "@dnd-kit/react";
import { isSortable, useSortable } from "@dnd-kit/react/sortable";
import { m } from "motion/react";
import {
  type ComponentProps,
  createContext,
  type ReactNode,
  type Ref,
  type RefObject,
  useContext,
  useId,
  useMemo,
  useRef,
} from "react";
import { mergeRefs } from "react-merge-refs";
import { css, cx } from "styled-system/css";

const listReset = css({ listStyle: "none", margin: 0, padding: 0 });
const itemReset = css({ listStyle: "none" });

type ReorderableListContextValue = {
  group: string;
  containerRef: RefObject<HTMLUListElement | null>;
};

const ReorderableListContext = createContext<ReorderableListContextValue | null>(null);

type ReorderableListProps<T extends { id: string | number }> = {
  values: T[];
  onReorder: (values: T[]) => void;
  className?: string;
  children: ReactNode;
};

export function ReorderableList<T extends { id: string | number }>({
  values,
  onReorder,
  className,
  children,
}: ReorderableListProps<T>) {
  // Doubles as the sortable type so items of different lists (and other drag sources sharing the
  // app-wide DragDropProvider) can't interact.
  const group = useId();
  const containerRef = useRef<HTMLUListElement>(null);

  useDragDropMonitor({
    onDragEnd(event) {
      const { source } = event.operation;
      if (event.canceled || !source || !isSortable(source)) return;
      if (source.group !== group && source.initialGroup !== group) return;
      const wrapped = values.map((value) => ({ id: `${group}:${value.id}`, value }));
      const next = move(wrapped, event);
      if (next !== wrapped) onReorder(next.map((entry) => entry.value));
    },
  });

  const contextValue = useMemo(() => ({ group, containerRef }), [group]);

  return (
    <ReorderableListContext.Provider value={contextValue}>
      <ul ref={containerRef} className={cx(listReset, className)}>
        {children}
      </ul>
    </ReorderableListContext.Provider>
  );
}

export type ReorderableItemRenderProps = {
  handleRef: (element: Element | null) => void;
  isDragging: boolean;
};

type ReorderableItemProps = {
  id: string | number;
  index: number;
  children: ReactNode | ((props: ReorderableItemRenderProps) => ReactNode);
} & Omit<ComponentProps<typeof m.li>, "children" | "id">;

export const ReorderableItem = ({ id, index, children, ref, className, ...motionProps }: ReorderableItemProps) => {
  const context = useContext(ReorderableListContext);
  const modifiers = useMemo(
    () => [
      RestrictToVerticalAxis,
      RestrictToElement.configure({ element: () => context?.containerRef.current ?? null }),
    ],
    [context],
  );
  const {
    ref: sortableRef,
    handleRef,
    isDragging,
  } = useSortable({
    id: `${context?.group}:${id}`,
    index,
    group: context?.group,
    type: context?.group ?? "reorderable-item",
    accept: context?.group ?? "reorderable-item",
    modifiers,
  });
  if (context === null) {
    throw new Error("ReorderableItem must be used inside ReorderableList");
  }

  return (
    <m.li
      layout="position"
      ref={mergeRefs([ref, sortableRef as Ref<HTMLLIElement>])}
      className={cx(itemReset, className)}
      {...motionProps}
    >
      {typeof children === "function" ? children({ handleRef, isDragging }) : children}
    </m.li>
  );
};
