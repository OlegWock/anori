import { translate } from "@anori/translations/utils";
import { defineWidget } from "@anori/utils/plugins/define";
import { TasksWidgetMock } from "./Mock";
import { TasksWidget } from "./TasksWidget";
import { TasksWidgetConfigScreen } from "./TasksWidgetConfig";

export const tasksWidgetDescriptor = defineWidget({
  id: "tasks-widget",
  get name() {
    return translate("tasks-plugin.name");
  },
  configurationScreen: TasksWidgetConfigScreen,
  mainScreen: TasksWidget,
  mock: TasksWidgetMock,
  appearance: {
    resizable: {
      min: { width: 2, height: 2 },
    },
    size: {
      width: 2,
      height: 2,
    },
  },
});
