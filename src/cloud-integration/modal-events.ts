export const OPEN_ANORI_PLUS_SETTINGS_EVENT = "anori:open-anori-plus-settings";

export const openAnoriPlusSettings = () => {
  window.dispatchEvent(new CustomEvent(OPEN_ANORI_PLUS_SETTINGS_EVENT));
};
