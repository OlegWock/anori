import { translate } from "@anori/translations/utils";
import { defineWidget } from "@anori/utils/plugins/define";
import { MainScreen, Mock } from "./NotesWidget";

export const notesWidgetDescriptor = defineWidget({
  id: "notes-widget",
  get name() {
    return translate("notes-plugin.name");
  },
  configurationScreen: null,
  mainScreen: MainScreen,
  mock: Mock,
  appearance: {
    resizable: {
      min: { width: 2, height: 1 },
    },
    size: {
      width: 2,
      height: 1,
    },
  },
});
