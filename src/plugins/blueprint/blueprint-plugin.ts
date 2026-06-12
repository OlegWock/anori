import { builtinIcons } from "@anori/design-system/components/Icon/builtin-icons";
import { translate } from "@anori/translations/utils";
import { type ContextOf, definePlugin } from "@anori/utils/plugins/define";
import { updateAllWidgets } from "./background";
import { handlers } from "./messaging";
import { blueprintPluginConfigSchema } from "./types";
import { BlueprintPluginConfigScreen } from "./widgets/BlueprintPluginConfig";
import { blueprintWidgetDescriptor } from "./widgets/descriptors";

// The plugin's identity: id + (optional) shared config + its widgets. The behavior context type is recovered
// from this with ContextOf<typeof base>, so background.ts can type its `ctx` without hand-writing it.
const base = definePlugin({
  id: "blueprint-plugin",
  get name() {
    return translate("blueprint-plugin.name");
  },
  icon: builtinIcons.plugin,
  // Optional plugin-level config. Omit this whole block for a plugin without shared settings.
  config: {
    schema: blueprintPluginConfigSchema,
    configurationScreen: BlueprintPluginConfigScreen,
  },
  widgets: [blueprintWidgetDescriptor],
});

export type BlueprintContext = ContextOf<typeof base>;

// Behaviors are attached after the identity is fixed; each receives a context typed from the widgets + config.
export const blueprintPlugin = base
  .withMessaging(handlers)
  .withScheduledCallback(15, updateAllWidgets)
  .withOnStart((ctx) => {
    console.log("Blueprint plugin started", ctx.pluginId);
  })
  .build();
