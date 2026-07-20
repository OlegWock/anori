import { ReactMarkdown } from "@anori/components/ReactMarkdown";
import { WhatsNew } from "@anori/components/WhatsNew";
import { Combobox } from "@anori/design-system/components/Combobox/Combobox";
import { Popover } from "@anori/design-system/components/Popover/Popover";
import { Select } from "@anori/design-system/components/Select/Select";
import { createLazyComponent, schedulePreload } from "@anori/utils/lazy-component";
import { preloadReorder } from "@anori/utils/motion/reorder";

export const SettingsModal = createLazyComponent(() => import("./settings/Settings").then((m) => m.SettingsModal));
export const NewWidgetWizard = createLazyComponent(() =>
  import("./components/NewWidgetWizard").then((m) => m.NewWidgetWizard),
);

export const scheduleLazyComponentsPreload = () =>
  schedulePreload([
    Select.preload,
    Combobox.preload,
    Popover.preload,
    ReactMarkdown.preload,
    WhatsNew.preload,
    preloadReorder,
    SettingsModal.preload,
    NewWidgetWizard.preload,
  ]);
