import type { Select as SelectType } from "@anori/components/Select";
import { cachedFunc } from "@anori/utils/misc";
import type { ReorderGroup as ReorderGroupType } from "@anori/utils/motion/lazy-load-reorder";
import { type ComponentType, type ReactNode, Suspense, lazy } from "react";

const loaders = {
  Select: cachedFunc(() => import("@anori/components/Select").then((module) => ({ default: module.Select }))),
  ReorderGroup: cachedFunc(() =>
    import("@anori/utils/motion/lazy-load-reorder").then((module) => ({ default: module.ReorderGroup })),
  ),
  ReorderItem: cachedFunc(() =>
    import("@anori/utils/motion/lazy-load-reorder").then((module) => ({ default: module.ReorderItem })),
  ),
  ReactMarkdown: cachedFunc(() => import("react-markdown")),
  BookmarksBar: cachedFunc(() =>
    import("@anori/components/BookmarksBar").then((module) => ({ default: module.BookmarksBar })),
  ),
  WhatsNew: cachedFunc(() => import("@anori/components/WhatsNew").then((m) => ({ default: m.WhatsNew }))),

  // TODO: these are components from pages/newtab folder, while this file resides in just components, this
  // breaks the hierarchy and should be fixed as part of wider structure reorganization
  SettingsModal: cachedFunc(() =>
    import("../pages/newtab/settings/Settings").then((m) => ({ default: m.SettingsModal })),
  ),
  NewWidgetWizard: cachedFunc(() =>
    import("../pages/newtab/components/NewWidgetWizard").then((m) => ({ default: m.NewWidgetWizard })),
  ),
} satisfies Record<string, () => Promise<{ default: ComponentType<any> }>>;

export const scheduleLazyComponentsPreload = () => {
  const triggerPreload = () => {
    console.log("Preloading lazy component");
    const funcs = Object.values(loaders);
    funcs.forEach((f) => f());
  };

  if ("requestIdleCallback" in window) {
    // Wait for idle, then wait 500ms
    requestIdleCallback(() => setTimeout(() => triggerPreload(), 500), { timeout: 3000 });
  } else {
    setTimeout(() => triggerPreload(), 3000);
  }
};

type CreateLazyComponentWithSuspenseOptions = {
  fallback?: ReactNode;
  name?: string;
};

type LazyComponentProps = {
  fallback?: ReactNode;
};

type LazyComponent<P> = ComponentType<P & { lazyOptions?: LazyComponentProps }> & {
  preload: () => Promise<ComponentType<P>>;
};

const createLazyComponentWithSuspense = <P,>(
  loader: () => Promise<{ default: ComponentType<P> }>,
  { fallback: fallbackFromOptions = null, name }: CreateLazyComponentWithSuspenseOptions = {},
): LazyComponent<P> => {
  const LazyComponent = lazy(loader);

  const Component: LazyComponent<P> = (props: P & { lazyOptions?: LazyComponentProps } & JSX.IntrinsicAttributes) => {
    console.log("Loading", name);
    return (
      <Suspense fallback={props.lazyOptions?.fallback ?? fallbackFromOptions ?? null}>
        <LazyComponent {...props} />
      </Suspense>
    );
  };

  Component.preload = () => loader().then((m) => m.default);

  return Component;
};

export const Select = createLazyComponentWithSuspense(loaders.Select) as typeof SelectType;
export const ReorderGroup = createLazyComponentWithSuspense(loaders.ReorderGroup) as typeof ReorderGroupType;
export const ReorderItem = createLazyComponentWithSuspense(loaders.ReorderItem);
export const ReactMarkdown = createLazyComponentWithSuspense(loaders.ReactMarkdown);
export const BookmarksBar = createLazyComponentWithSuspense(loaders.BookmarksBar);
export const WhatsNew = createLazyComponentWithSuspense(loaders.WhatsNew);
export const SettingsModal = createLazyComponentWithSuspense(loaders.SettingsModal, { name: "SettingLazyWrapper" });
export const NewWidgetWizard = createLazyComponentWithSuspense(loaders.NewWidgetWizard);
