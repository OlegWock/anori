import type { Select as SelectType } from "@anori/components/Select";
import { type CachedPromiseFuncReturn, cachedPromiseFunc } from "@anori/utils/misc";
import type { ReorderGroup as ReorderGroupType } from "@anori/utils/motion/lazy-load-reorder";
import { type ComponentType, type JSX, type ReactNode, Suspense, lazy, useMemo } from "react";

const loaders = {
  Select: cachedPromiseFunc(() => import("@anori/components/Select").then((m) => m.Select)),
  ReorderGroup: cachedPromiseFunc(() => import("@anori/utils/motion/lazy-load-reorder").then((m) => m.ReorderGroup)),
  ReorderItem: cachedPromiseFunc(() => import("@anori/utils/motion/lazy-load-reorder").then((m) => m.ReorderItem)),
  ReactMarkdown: cachedPromiseFunc(() => import("react-markdown").then((m) => m.default)),
  BookmarksBar: cachedPromiseFunc(() => import("@anori/components/BookmarksBar").then((m) => m.BookmarksBar)),
  WhatsNew: cachedPromiseFunc(() => import("@anori/components/WhatsNew").then((m) => m.WhatsNew)),

  // TODO: these are components from pages/newtab folder, while this file resides in just components, this
  // breaks the hierarchy and should be fixed as part of wider structure reorganization
  SettingsModal: cachedPromiseFunc(() => import("../pages/newtab/settings/Settings").then((m) => m.SettingsModal)),
  NewWidgetWizard: cachedPromiseFunc(() =>
    import("../pages/newtab/components/NewWidgetWizard").then((m) => m.NewWidgetWizard),
  ),
} as const;

export const scheduleLazyComponentsPreload = () => {
  const triggerPreload = () => {
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
  loader: () => CachedPromiseFuncReturn<ComponentType<P>>,
  { fallback: fallbackFromOptions = null, name }: CreateLazyComponentWithSuspenseOptions = {},
): LazyComponent<P> => {
  const LazyComponent = lazy(() => loader().promise.then((comp) => ({ default: comp })));

  const Component: LazyComponent<P> = (props: P & { lazyOptions?: LazyComponentProps } & JSX.IntrinsicAttributes) => {
    // When rendered multiple times, loader might return 'unresolved' at first and then 'resolved' on subsequent renders
    // This will cause us to render different root component which will reset any state in child components. To avoid
    // this we remember value returned at first render to keep rendered component stable.
    //
    // `loader` is `createLazyComponentWithSuspense`, which isn't react component, but biome can't detect that
    // biome-ignore lint/correctness/useExhaustiveDependencies:
    const val = useMemo(() => loader(), []);

    if (val.status === "resolved") {
      const Component = val.value;
      return <Component {...props} />;
    }

    return (
      <Suspense fallback={props.lazyOptions?.fallback ?? fallbackFromOptions ?? null}>
        <LazyComponent {...props} />
      </Suspense>
    );
  };

  Component.preload = () => loader().promise;
  Component.displayName = name ?? `LazyWrapper(Component)`;

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
