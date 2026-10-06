import { builtinIcons } from "@anori/design-system/components/Icon/builtin-icons";
import { translate } from "@anori/translations/utils";
import { definePlugin } from "@anori/utils/plugins/define";
import {
  ageTickerDescriptor,
  dayCounterDescriptor,
  dayProgressDescriptor,
  focusDescriptor,
  lifeProgressDescriptor,
  monthProgressDescriptor,
  weekProgressDescriptor,
  yearProgressDescriptor,
} from "./widgets/descriptors";

export const motivationPlugin = definePlugin({
  id: "motivation-plugin",
  get name() {
    return translate("motivation-plugin.name");
  },
  icon: builtinIcons.flame,
  widgets: [
    dayProgressDescriptor,
    weekProgressDescriptor,
    monthProgressDescriptor,
    yearProgressDescriptor,
    lifeProgressDescriptor,
    ageTickerDescriptor,
    focusDescriptor,
    dayCounterDescriptor,
  ],
}).build();
