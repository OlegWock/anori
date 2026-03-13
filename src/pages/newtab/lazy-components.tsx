import { createLazyComponentWithSuspense, registerLazyComponentsForPreload } from "@anori/components/lazy-components";
import { cachedPromiseFunc } from "@anori/utils/misc";

const loaders = {
  SettingsModal: cachedPromiseFunc(() => import("./settings/Settings").then((m) => m.SettingsModal)),
  NewWidgetWizard: cachedPromiseFunc(() => import("./components/NewWidgetWizard").then((m) => m.NewWidgetWizard)),
  CloudAccountModal: cachedPromiseFunc(() =>
    import("@anori/cloud-integration/components/CloudAccountModal").then((m) => m.CloudAccountModal),
  ),
} as const;

registerLazyComponentsForPreload(loaders);

export const SettingsModal = createLazyComponentWithSuspense(loaders.SettingsModal, { name: "SettingLazyWrapper" });
export const NewWidgetWizard = createLazyComponentWithSuspense(loaders.NewWidgetWizard);
export const CloudAccountModal = createLazyComponentWithSuspense(loaders.CloudAccountModal);
