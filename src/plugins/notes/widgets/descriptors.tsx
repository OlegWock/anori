import { translate } from "@anori/translations/utils";
import { defineWidget } from "@anori/utils/plugins/define";
import { NotesWidget, NotesWidgetMock } from "./NotesWidget";

export const notesWidgetDescriptor = defineWidget({
  id: "notes-widget",
  get name() {
    return translate("notes-plugin.name");
  },
  configurationScreen: null,
  mainScreen: NotesWidget,
  mock: NotesWidgetMock,
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
