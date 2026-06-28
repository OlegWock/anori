import BiInboxFill from "~icons/bi/inbox-fill?raw";
import BiPip from "~icons/bi/pip?raw";
import BoxiconsBookBookmarkFilled from "~icons/boxicons/book-bookmark-filled?raw";
import ClarityPictureSolid from "~icons/clarity/picture-solid?raw";
import FaSolidListOl from "~icons/fa-solid/list-ol?raw";
import FluentKey20Regular from "~icons/fluent/key-20-regular?raw";
import PlugDisconnected48Regular from "~icons/fluent/plug-disconnected-48-regular?raw";
import FluentSpinnerIos20Regular from "~icons/fluent/spinner-ios-20-regular?raw";
import HumbleiconsLogout from "~icons/humbleicons/logout?raw";
import IcBaselineDragIndicator from "~icons/ic/baseline-drag-indicator?raw";
import IcBaselineTab from "~icons/ic/baseline-tab?raw";
import IcOutlineWindow from "~icons/ic/outline-window?raw";
import IonAdd from "~icons/ion/add?raw";
import IonAlbums from "~icons/ion/albums?raw";
import IonAlertCircle from "~icons/ion/alert-circle?raw";
import IonArchiveSharp from "~icons/ion/archive-sharp?raw";
import IonArrowBack from "~icons/ion/arrow-back?raw";
import IonArrowForward from "~icons/ion/arrow-forward?raw";
import IonBookmark from "~icons/ion/bookmark?raw";
import IonCalculator from "~icons/ion/calculator?raw";
import IonCalendar from "~icons/ion/calendar?raw";
import IonCheckmark from "~icons/ion/checkmark?raw";
import IonCheckmarkSharp from "~icons/ion/checkmark-sharp?raw";
import IonChevronBack from "~icons/ion/chevron-back?raw";
import IonChevronDown from "~icons/ion/chevron-down?raw";
import IonChevronForward from "~icons/ion/chevron-forward?raw";
import IonChevronUp from "~icons/ion/chevron-up?raw";
import IonClock from "~icons/ion/clock?raw";
import IonClose from "~icons/ion/close?raw";
import IonCloud from "~icons/ion/cloud?raw";
import IonCodeSlashSharp from "~icons/ion/code-slash-sharp?raw";
import IonColorPalette from "~icons/ion/color-palette?raw";
import IonCompass from "~icons/ion/compass?raw";
import IonDice from "~icons/ion/dice?raw";
import IonExpand from "~icons/ion/expand?raw";
import IonFileTrayFull from "~icons/ion/file-tray-full?raw";
import IonFolderOpenSharp from "~icons/ion/folder-open-sharp?raw";
import IonHelpBuoySharp from "~icons/ion/help-buoy-sharp?raw";
import IonHelpCircle from "~icons/ion/help-circle?raw";
import IonHome from "~icons/ion/home?raw";
import IonInformationCircle from "~icons/ion/information-circle?raw";
import IonLocationSharp from "~icons/ion/location-sharp?raw";
import IonLogoRss from "~icons/ion/logo-rss?raw";
import IonNewspaperOutline from "~icons/ion/newspaper-outline?raw";
import IonPencil from "~icons/ion/pencil?raw";
import IonPersonCircle from "~icons/ion/person-circle?raw";
import IonResize from "~icons/ion/resize?raw";
import IonSettingsSharp from "~icons/ion/settings-sharp?raw";
import IonSpeedometer from "~icons/ion/speedometer?raw";
import IonTimeOutline from "~icons/ion/time-outline?raw";
import IonTrash from "~icons/ion/trash?raw";
import IonWarning from "~icons/ion/warning?raw";
import JamRefresh from "~icons/jam/refresh?raw";
import LogosFacebook from "~icons/logos/facebook?raw";
import LogosGithubIcon from "~icons/logos/github-icon?raw";
import LogosJira from "~icons/logos/jira?raw";
import LogosNotionIcon from "~icons/logos/notion-icon?raw";
import LogosTwitter from "~icons/logos/twitter?raw";
import LogosWhatsappIcon from "~icons/logos/whatsapp-icon?raw";
import MajesticonsOpen from "~icons/majesticons/open?raw";
import MingcutePlguinFill from "~icons/mingcute/plugin-2-fill?raw";
import OcticonUnlink16 from "~icons/octicon/unlink-16?raw";
import PhTabsFill from "~icons/ph/tabs-fill?raw";
import SolarChecklistBold from "~icons/solar/checklist-bold?raw";
import WiCloud from "~icons/wi/cloud?raw";
import WiDaySunny from "~icons/wi/day-sunny?raw";
import WiDaySunnyOvercast from "~icons/wi/day-sunny-overcast?raw";
import WiFog from "~icons/wi/fog?raw";
import WiRain from "~icons/wi/rain?raw";
import WiRainMix from "~icons/wi/rain-mix?raw";
import WiShowers from "~icons/wi/showers?raw";
import WiSnow from "~icons/wi/snow?raw";
import WiThunderstorm from "~icons/wi/thunderstorm?raw";

// This is all icons we bundle together with the extension
const builtinIconSvgsBySourceId = {
  "ion:add": IonAdd,
  "ion:archive-sharp": IonArchiveSharp,
  "ion:arrow-back": IonArrowBack,
  "ion:arrow-forward": IonArrowForward,
  "ion:close": IonClose,
  "ion:code-slash-sharp": IonCodeSlashSharp,
  "ion:color-palette": IonColorPalette,
  "ion:file-tray-full": IonFileTrayFull,
  "ion:folder-open-sharp": IonFolderOpenSharp,
  "ion:help-buoy-sharp": IonHelpBuoySharp,
  "ion:settings-sharp": IonSettingsSharp,
  "ion:chevron-back": IonChevronBack,
  "ion:chevron-forward": IonChevronForward,
  "ion:chevron-down": IonChevronDown,
  "ion:chevron-up": IonChevronUp,
  "ic:baseline-drag-indicator": IcBaselineDragIndicator,
  "ion:pencil": IonPencil,
  "ion:person-circle": IonPersonCircle,
  "ion:resize": IonResize,
  "ion:bookmark": IonBookmark,
  "ion:checkmark": IonCheckmark,
  "ion:checkmark-sharp": IonCheckmarkSharp,
  "ion:information-circle": IonInformationCircle,
  "ion:trash": IonTrash,
  "ion:warning": IonWarning,
  "ion:alert-circle": IonAlertCircle,
  "ion:help-circle": IonHelpCircle,
  "ion:location-sharp": IonLocationSharp,
  "ion:time-outline": IonTimeOutline,
  "jam:refresh": JamRefresh,
  "fluent:spinner-ios-20-regular": FluentSpinnerIos20Regular,
  "fluent:key-20-regular": FluentKey20Regular,
  "fluent:plug-disconnected-48-regular": PlugDisconnected48Regular,
  "humbleicons:logout": HumbleiconsLogout,
  "octicon:unlink-16": OcticonUnlink16,
  "ion:calculator": IonCalculator,
  "ion:albums": IonAlbums,
  "ion:newspaper-outline": IonNewspaperOutline,
  "ion:expand": IonExpand,
  "ion:logo-rss": IonLogoRss,
  "ion:home": IonHome,
  "ion:cloud": IonCloud,
  "ion:compass": IonCompass,
  "ion:dice": IonDice,

  "majesticons:open": MajesticonsOpen,

  "mingcute:plugin-2-fill": MingcutePlguinFill,

  "logos:facebook": LogosFacebook,
  "logos:github-icon": LogosGithubIcon,
  "logos:jira": LogosJira,
  "logos:notion-icon": LogosNotionIcon,
  "logos:twitter": LogosTwitter,
  "logos:whatsapp-icon": LogosWhatsappIcon,

  "ic:baseline-tab": IcBaselineTab,
  "ic:outline-window": IcOutlineWindow,
  "wi:day-sunny": WiDaySunny,
  "wi:day-sunny-overcast": WiDaySunnyOvercast,
  "wi:fog": WiFog,
  "wi:showers": WiShowers,
  "wi:rain-mix": WiRainMix,
  "wi:rain": WiRain,
  "wi:snow": WiSnow,
  "wi:thunderstorm": WiThunderstorm,
  "wi:cloud": WiCloud,
  "ion:calendar": IonCalendar,
  "ion:clock": IonClock,
  "bi:pip": BiPip,
  "boxicons:book-bookmark-filled": BoxiconsBookBookmarkFilled,
  "clarity:picture-solid": ClarityPictureSolid,
  "ph:tabs-fill": PhTabsFill,
  "ion:speedometer": IonSpeedometer,
  "solar:checklist-bold": SolarChecklistBold,
  "fa-solid:list-ol": FaSolidListOl,
  "bi:inbox-fill": BiInboxFill,
} as const satisfies Record<string, string>;

export type BuiltInIconId = keyof typeof builtinIconSvgsBySourceId;

// Semantic names for icons so raw ids are not scattered across the codebase
export const builtinIcons = {
  add: "ion:add",
  archive: "ion:archive-sharp",
  arrowBack: "ion:arrow-back",
  arrowForward: "ion:arrow-forward",
  close: "ion:close",
  code: "ion:code-slash-sharp",
  palette: "ion:color-palette",
  fileTray: "ion:file-tray-full",
  folder: "ion:folder-open-sharp",
  home: "ion:home",
  cloud: "ion:cloud",
  compass: "ion:compass",
  dice: "ion:dice",
  helpBuoy: "ion:help-buoy-sharp",
  settings: "ion:settings-sharp",
  chevronBack: "ion:chevron-back",
  chevronForward: "ion:chevron-forward",
  chevronDown: "ion:chevron-down",
  chevronUp: "ion:chevron-up",
  dragHandle: "ic:baseline-drag-indicator",
  pencil: "ion:pencil",
  personCircle: "ion:person-circle",
  resize: "ion:resize",
  check: "ion:checkmark",
  checkSharp: "ion:checkmark-sharp",
  informationCircle: "ion:information-circle",
  trash: "ion:trash",
  warning: "ion:warning",
  alertCircle: "ion:alert-circle",
  helpCircle: "ion:help-circle",
  location: "ion:location-sharp",
  time: "ion:time-outline",
  refresh: "jam:refresh",
  spinner: "fluent:spinner-ios-20-regular",
  disconnected: "fluent:plug-disconnected-48-regular",
  key: "fluent:key-20-regular",
  logout: "humbleicons:logout",
  unlink: "octicon:unlink-16",
  calculator: "ion:calculator",
  openOutline: "majesticons:open",
  albums: "ion:albums",
  newspaper: "ion:newspaper-outline",
  expand: "ion:expand",
  rssIcon: "ion:logo-rss",
  plugin: "mingcute:plugin-2-fill",
  bookmark: "ion:bookmark",
  bookmarksManager: "boxicons:book-bookmark-filled",
  calendar: "ion:calendar",
  clock: "ion:clock",
  pip: "bi:pip",
  picture: "clarity:picture-solid",
  tabsFill: "ph:tabs-fill",
  speedometer: "ion:speedometer",
  checklist: "solar:checklist-bold",
  listOl: "fa-solid:list-ol",
  empty: "bi:inbox-fill",

  logos: {
    facebook: "logos:facebook",
    github: "logos:github-icon",
    jira: "logos:jira",
    notion: "logos:notion-icon",
    twitter: "logos:twitter",
    whatsapp: "logos:whatsapp-icon",
  },

  recentlyClosedTabs: {
    tab: "ic:baseline-tab",
    window: "ic:outline-window",
  },

  weather: {
    sunny: "wi:day-sunny",
    partlyCloudy: "wi:day-sunny-overcast",
    fog: "wi:fog",
    showers: "wi:showers",
    rainMix: "wi:rain-mix",
    rain: "wi:rain",
    snow: "wi:snow",
    thunderstorm: "wi:thunderstorm",
    cloud: "wi:cloud",
  },
} as const satisfies Record<string, BuiltInIconId | Record<string, BuiltInIconId>>;

export const getBuiltinIcon = (id: string) =>
  id in builtinIconSvgsBySourceId ? builtinIconSvgsBySourceId[id as BuiltInIconId] : null;
