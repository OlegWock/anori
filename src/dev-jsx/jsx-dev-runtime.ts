import { Fragment, jsxDEV as reactJsxDEV } from "react/jsx-dev-runtime";

export { Fragment };

type JsxSource = { fileName?: string; lineNumber?: number; columnNumber?: number };

const FORWARD_REF = Symbol.for("react.forward_ref");
const MEMO = Symbol.for("react.memo");

// Which element types are safe + useful to stamp `data-*` onto:
//  - intrinsic DOM elements (string) → tagged directly;
//  - forwardRef / memo exotics → they forward unknown props (incl. data-*) to the DOM node they render,
//    so the source flows through. This covers framer-motion's `m.div`, Radix primitives, Panda `styled`
//    components, and our own forwardRef components — none of which compile through this runtime.
// Skipped: symbol types (Fragment/Suspense/StrictMode) and context providers, which warn on stray props;
// and plain function components, which usually render an intrinsic we already tag.
const canTag = (type: unknown): boolean => {
  if (typeof type === "string") return true;
  if (typeof type === "object" && type !== null) {
    const kind = (type as { $$typeof?: symbol }).$$typeof;
    return kind === FORWARD_REF || kind === MEMO;
  }
  return false;
};

// Dev-only JSX runtime wrapper. SWC routes JSX here (via `importSource`) only in development builds and
// hands us each element's source location, which we stamp onto `data-component` / `data-source` so
// elements are identifiable in the DevTools Elements panel — React DevTools can't run on a chrome-
// extension page, and Panda's atomic class names give no hint of origin. Where an element belongs to its
// own component (an intrinsic in Button.tsx, say) the innermost tag wins, since it's applied last.
// Compiled out entirely in production (importSource isn't set there).
export const jsxDEV: typeof reactJsxDEV = (type, props, key, isStaticChildren, source, self) => {
  const src = source as JsxSource | undefined;
  if (src?.fileName && canTag(type)) {
    // Strip everything up to and including the project `src/` (handles absolute or relative paths).
    const rel = src.fileName.match(/(?:^|\/)src\/(.*)$/)?.[1] ?? src.fileName;
    const component = rel
      .split("/")
      .pop()
      ?.replace(/\.[jt]sx?$/, "");
    const tagged = {
      ...(props as Record<string, unknown>),
      "data-component": component,
      "data-source": src.lineNumber ? `${rel}:${src.lineNumber}` : rel,
    };
    return reactJsxDEV(type, tagged as Parameters<typeof reactJsxDEV>[1], key, isStaticChildren, source, self);
  }
  return reactJsxDEV(type, props, key, isStaticChildren, source, self);
};
