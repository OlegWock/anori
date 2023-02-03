import { AodakePlugin } from "@utils/user-data/types";
import { examplePlugin } from "./example/example";


export const availablePlugins: AodakePlugin[] = [
    examplePlugin,
];

export const availablePluginsWithWidgets = availablePlugins.filter(p => p.widgets.length > 0);