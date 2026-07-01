import { createLazyComponent } from "@anori/utils/lazy-component";

export const WhatsNew = createLazyComponent(() => import("./WhatsNewImpl").then((m) => m.WhatsNewImpl));
