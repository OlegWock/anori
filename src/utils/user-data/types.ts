import { builtinIcons } from "@anori/components/icon/builtin-icons";
import { type Language, translate } from "@anori/translations/index";
import type { GridItem } from "@anori/utils/grid/types";
import type {
  AnoriPlugin,
  ConfigFromWidgetDescriptor,
  IDFromWidgetDescriptor,
  WidgetDescriptor,
} from "@anori/utils/plugins/types";
import type { ID, Mapping } from "@anori/utils/types";
import type { CustomTheme, Theme } from "./theme";

type UsageQuantifiableMetrics =
  | "Times new tab opened"
  | "Times hotkey used"
  | "Times navigated to another folder"
  | `Interactions / ${string} / ${string} / ${string}`; // plugin id / widget id / interaction type

export type StorageContent = {
  folders: Folder[];
  theme: Theme["name"];
  customThemes: CustomTheme[];
  userId: string;
  sidebarOrientation: "vertical" | "horizontal" | "auto";
  autoHideSidebar: boolean;
  showBookmarksBar: boolean;
  rememberLastFolder: boolean;
  lastFolder: string | undefined;

  analyticsEnabled: boolean;
  analyticsLastSend: number;

  hasUnreadReleaseNotes: boolean;
  finishedOnboarding: boolean;

  compactMode: boolean;
  automaticCompactMode: boolean;
  automaticCompactModeThreshold: number;
  showLoadAnimation: boolean;
  newTabTitle: string;
  language: Language;

  dailyUsageMetrics: { [key in UsageQuantifiableMetrics]?: number };
  performanceAvgLcp: {
    avg: number;
    n: number;
  };
  performanceRawInp: number[];

  storageVersion: number;
};

export type Folder = {
  id: ID;
  name: string;
  icon: string;
};

export type FolderDetailsInStorage = {
  widgets: WidgetInFolder[];
};

export type WidgetInFolder<
  PID extends ID = ID,
  WD extends WidgetDescriptor[] = WidgetDescriptor[],
  W extends WD[number] = WD[number],
  WID extends IDFromWidgetDescriptor<W> = IDFromWidgetDescriptor<W>,
> = {
  pluginId: PID;
  widgetId: WID;
  instanceId: ID;
  configuration: ConfigFromWidgetDescriptor<W>;
} & GridItem;

export type WidgetInFolderWithMeta<
  PID extends ID = ID,
  WD extends WidgetDescriptor[] = WidgetDescriptor[],
  W extends WD[number] = WD[number],
  WID extends IDFromWidgetDescriptor<W> = IDFromWidgetDescriptor<W>,
> = WidgetInFolder<PID, WD, W, WID> & {
  plugin: AnoriPlugin<PID, Mapping, WD>;
  widget: W;
};

export type DistributedWidgetInFolderWithMeta<
  PID extends ID = ID,
  WD extends WidgetDescriptor[] = WidgetDescriptor[],
> = WD extends (infer W)[] ? (W extends WD[number] ? WidgetInFolderWithMeta<PID, WD, W> : never) : never;

export const homeFolder = {
  id: "home",
  get name() {
    return translate("home");
  },
  icon: builtinIcons.home,
} satisfies Folder;
