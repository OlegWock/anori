import type { ReactNode, Ref } from "react";
import { createRoot } from "react-dom/client";
import { mergeRefs } from "react-merge-refs";

export const mountPage = (element: ReactNode) => {
  const node = document.getElementById("root");
  if (!node) {
    throw new Error("Called mountPage in invalid context");
  }
  const root = createRoot(node);
  root.render(element);

  return () => {
    root.unmount();
  };
};

export const combineRefs = (...args: (Ref<any> | undefined)[]) => {
  return mergeRefs(args.filter((a) => !!a));
};
