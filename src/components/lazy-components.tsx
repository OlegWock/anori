import type { Select as SelectType } from "@anori/components/Select";
import { cachedFunc } from "@anori/utils/misc";
import type { ReorderGroup as ReorderGroupType } from "@anori/utils/motion/lazy-load-reorder";
import { type ComponentType, Suspense, lazy } from "react";

const loaders = {
  // TODO: add other components here and update usage
  // Settings modal, Whats new modal, New widget wizard, Bookmarks bar
  Select: cachedFunc(() => import("@anori/components/Select").then((module) => ({ default: module.Select }))),
  ReorderGroup: cachedFunc(() =>
    import("@anori/utils/motion/lazy-load-reorder").then((module) => ({ default: module.ReorderGroup })),
  ),
  ReorderItem: cachedFunc(() =>
    import("@anori/utils/motion/lazy-load-reorder").then((module) => ({ default: module.ReorderItem })),
  ),
  ReactMarkdown: cachedFunc(() => import("react-markdown")),
} satisfies Record<string, () => Promise<{ default: ComponentType<any> }>>;

export const scheduleLazyComponentsPreload = () => {
  const triggerPreload = () => {
    console.log("Preloading lazy component");
    const funcs = Object.values(loaders);
    funcs.forEach((f) => f());
  };

  if ("requestIdleCallback" in window) {
    // Wait for idle, then wait 500ms
    requestIdleCallback(() => setTimeout(() => triggerPreload(), 500), { timeout: 5000 });
  } else {
    setTimeout(() => triggerPreload(), 5000);
  }
};

const createLazyComponentWithSuspense = <P,>(loader: () => Promise<{ default: ComponentType<P> }>) => {
  const LazyComponent = lazy(loader);

  const Component = (props: P & JSX.IntrinsicAttributes) => {
    return (
      <Suspense fallback={<div>Loading...</div>}>
        <LazyComponent {...props} />
      </Suspense>
    );
  };

  return Component;
};

export const Select = createLazyComponentWithSuspense(loaders.Select) as typeof SelectType;
export const ReorderGroup = createLazyComponentWithSuspense(loaders.ReorderGroup) as typeof ReorderGroupType;
export const ReorderItem = createLazyComponentWithSuspense(loaders.ReorderItem);
export const ReactMarkdown = createLazyComponentWithSuspense(loaders.ReactMarkdown);
