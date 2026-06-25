import { m } from "motion/react";
import { type ComponentProps, type ComponentType, useSyncExternalStore } from "react";
import type { ReorderGroup as ReorderGroupType, ReorderItem as ReorderItemType } from "./lazy-load-reorder";

// framer-motion's Reorder is a heavy chunk only needed for drag-to-reorder. We render a static (but
// identical-looking) list immediately and load Reorder in the background, swapping it in once ready —
// the user can't be reordering in the first frames anyway.
type ReorderModule = { Group: typeof ReorderGroupType; Item: typeof ReorderItemType };

let loaded: ReorderModule | null = null;
let loading: Promise<void> | undefined;
const listeners = new Set<() => void>();

const startLoad = () => {
  if (loaded || loading) return;
  loading = import("./lazy-load-reorder").then((mod) => {
    loaded = { Group: mod.ReorderGroup, Item: mod.ReorderItem };
    for (const notify of listeners) notify();
  });
};

const subscribe = (notify: () => void) => {
  startLoad();
  listeners.add(notify);
  return () => listeners.delete(notify);
};

const useReorderModule = () =>
  useSyncExternalStore(
    subscribe,
    () => loaded,
    () => loaded,
  );

type GroupProps = ComponentProps<typeof ReorderGroupType>;
type ItemProps = ComponentProps<typeof ReorderItemType>;

// `m` indexed by tag name → the matching motion component (the static fallback keeps the enter animation).
const motionTag = (tag: ItemProps["as"]): ComponentType<Record<string, unknown>> =>
  (m as unknown as Record<string, ComponentType<Record<string, unknown>>>)[typeof tag === "string" ? tag : "div"];

const HybridGroup = ({ values, onReorder, axis, as, ...rest }: GroupProps) => {
  const mod = useReorderModule();
  if (mod) return <mod.Group values={values} onReorder={onReorder} axis={axis} as={as} {...rest} />;
  const Tag = motionTag(as ?? "ul");
  return <Tag {...rest} />;
};

const HybridItem = ({ value, as, ...rest }: ItemProps) => {
  const mod = useReorderModule();
  if (mod) return <mod.Item value={value} as={as} {...rest} />;
  const Tag = motionTag(as ?? "li");
  return <Tag {...rest} />;
};

export const ReorderGroup = HybridGroup as typeof ReorderGroupType;
export const ReorderItem = HybridItem as typeof ReorderItemType;
