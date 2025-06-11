//////////////////////////////////////////////////////////////////
//////// THIS FILE IS GENERATED AUTOMATICALLY DO NOT EDIT ////////
////// TO MODIFY THIS FILE HEAD TO generate-icons-assets.ts //////
//////////////////////////////////////////////////////////////////

import { translate } from "@anori/translations/index";
import { CUSTOM_ICONS_AVAILABLE } from "@anori/utils/custom-icons";

export const allSets = [
  "ion", // https://icon-sets.iconify.design/ion/
  "fluent", // https://icon-sets.iconify.design/fluent/
  "ic", // https://icon-sets.iconify.design/ic/
  "jam", // https://icon-sets.iconify.design/jam/
  "fluent-emoji-flat", // https://icon-sets.iconify.design/fluent-emoji-flat/
  "twemoji", // https://icon-sets.iconify.design/twemoji/
  "flat-color-icons", // https://icon-sets.iconify.design/flat-color-icons/
  "logos", // https://icon-sets.iconify.design/logos/
  "skill-icons", // https://icon-sets.iconify.design/skill-icons/
  "vscode-icons", // https://icon-sets.iconify.design/vscode-icons/
  "circle-flags", // https://icon-sets.iconify.design/circle-flags/
  "flagpack", // https://icon-sets.iconify.design/flagpack/
  "wi", // https://icon-sets.iconify.design/wi/,
];

export const iconSetPrettyNames: Record<string, string> = {
  "ion": "IonIcons",
  "fluent": "Fluent UI System Icons",
  "ic": "Google Material Icons",
  "jam": "Jam Icons",
  "fluent-emoji-flat": "Fluent Emoji Flat",
  "twemoji": "Twitter Emoji",
  "flat-color-icons": "Flat Color Icons",
  "logos": "SVG Logos",
  "skill-icons": "Skill Icons",
  "vscode-icons": "VSCode Icons",
  "circle-flags": "Circle Flags",
  "flagpack": "Flagpack",
  "wi": "Weather Icons",
} as const;

if (CUSTOM_ICONS_AVAILABLE) {
  // Icons uploaded by user
  allSets.push("custom");
  Object.defineProperty(iconSetPrettyNames, "custom", {
    get: () => translate("customIcons"),
  });
}
