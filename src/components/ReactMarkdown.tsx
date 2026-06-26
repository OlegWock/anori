import { createLazyComponent } from "@anori/utils/lazy-component";

export const ReactMarkdown = createLazyComponent(() => import("react-markdown").then((m) => m.default));
