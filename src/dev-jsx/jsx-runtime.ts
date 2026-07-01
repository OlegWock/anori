// Pass-through for the non-dev automatic runtime. Dev builds use jsx-dev-runtime (which does the
// tagging); this exists only so `@anori/dev-jsx/jsx-runtime` resolves if anything reaches for it.
export { Fragment, jsx, jsxs } from "react/jsx-runtime";
