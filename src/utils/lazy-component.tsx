import { type ComponentProps, type ComponentType, type JSX, type ReactNode, useSyncExternalStore } from "react";

export type LazyModule<T> = {
  /** Hook: subscribes a component, kicks off the load on first use, and returns the module (or null while loading). */
  useModule: () => T | null;
  /** Imperative load, callable outside React (e.g. to warm the chunk ahead of time). Idempotent. */
  preload: () => Promise<T>;
};

/**
 * Background-loads a dynamically imported module and exposes it through an external store, so consumers can
 * render a placeholder via conditional rendering until it arrives — no Suspense. Loading can be triggered
 * either by rendering (`useModule`) or imperatively (`preload`).
 */
export const createLazyModule = <T,>(loader: () => Promise<T>): LazyModule<T> => {
  let value: T | null = null;
  let promise: Promise<T> | undefined;
  const listeners = new Set<() => void>();

  const preload = () => {
    if (!promise) {
      promise = loader().then((mod) => {
        value = mod;
        for (const notify of listeners) notify();
        return mod;
      });
    }
    return promise;
  };

  const subscribe = (notify: () => void) => {
    preload();
    listeners.add(notify);
    return () => {
      listeners.delete(notify);
    };
  };

  const useModule = () =>
    useSyncExternalStore(
      subscribe,
      () => value,
      () => value,
    );

  return { useModule, preload };
};

// Parameterized by the wrapped component type `C` (not its props), so a generic component keeps its own
// call signature through the wrapper — callers get `typeof Foo & { preload }` with no cast needed. The
// `any` upper bound is the standard "any component" bound; a narrower props type collapses ComponentProps<C>.
// biome-ignore lint/suspicious/noExplicitAny: see above.
export type LazyComponent<C extends ComponentType<any>> = C & { preload: () => Promise<C> };

/**
 * Wraps a dynamically imported component so it loads in the background and renders a fallback until ready —
 * conditional rendering via {@link createLazyModule}, no Suspense. The `fallback` may be a ReactNode or a
 * component (which receives the same props, e.g. to mirror the real component's footprint while loading).
 * The returned component exposes `preload()` for warming the chunk imperatively.
 */
// biome-ignore lint/suspicious/noExplicitAny: "any component" upper bound (see LazyComponent above).
export const createLazyComponent = <C extends ComponentType<any>>(
  loader: () => Promise<C>,
  { fallback }: { fallback?: ReactNode | ComponentType<ComponentProps<C>> } = {},
): LazyComponent<C> => {
  const mod = createLazyModule(loader);

  const Component = (props: ComponentProps<C>) => {
    const Loaded = mod.useModule() as ComponentType<ComponentProps<C>> | null;
    const forwarded = props as ComponentProps<C> & JSX.IntrinsicAttributes;
    if (Loaded) return <Loaded {...forwarded} />;
    if (typeof fallback === "function") {
      const Fallback = fallback as ComponentType<ComponentProps<C>>;
      return <Fallback {...forwarded} />;
    }
    return <>{(fallback as ReactNode) ?? null}</>;
  };

  return Object.assign(Component, { preload: mod.preload }) as unknown as LazyComponent<C>;
};

/** Warms the given components' chunks once the browser is idle. */
export const schedulePreload = (preloaders: Array<() => unknown>) => {
  const run = () => {
    console.log("Preloading lazy components", preloaders);
    for (const preload of preloaders) preload();
  };

  if (typeof requestIdleCallback === "function") {
    requestIdleCallback(() => setTimeout(run, 500), { timeout: 3000 });
  } else {
    setTimeout(run, 3000);
  }
};
