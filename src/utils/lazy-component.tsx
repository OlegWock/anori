import { type ComponentType, type JSX, type ReactNode, useSyncExternalStore } from "react";

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

export type LazyComponent<P> = ComponentType<P> & { preload: () => Promise<ComponentType<P>> };

/**
 * Wraps a dynamically imported component so it loads in the background and renders a fallback until ready —
 * conditional rendering via {@link createLazyModule}, no Suspense. The `fallback` may be a ReactNode or a
 * component (which receives the same props, e.g. to mirror the real component's footprint while loading).
 * The returned component exposes `preload()` for warming the chunk imperatively.
 */
export const createLazyComponent = <P,>(
  loader: () => Promise<ComponentType<P>>,
  { fallback }: { fallback?: ReactNode | ComponentType<P> } = {},
): LazyComponent<P> => {
  const mod = createLazyModule(loader);

  const Component = (props: P) => {
    const Loaded = mod.useModule();
    const forwarded = props as P & JSX.IntrinsicAttributes;
    if (Loaded) return <Loaded {...forwarded} />;
    if (typeof fallback === "function") {
      const Fallback = fallback as ComponentType<P>;
      return <Fallback {...forwarded} />;
    }
    return <>{(fallback as ReactNode) ?? null}</>;
  };

  return Object.assign(Component, { preload: mod.preload }) as LazyComponent<P>;
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
