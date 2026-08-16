import type { OklchColor } from "@anori/utils/color";
import { buildPalette, detectGamut, type Mode, type Palette, tokensToCssVars } from "./color-engine";

// Retheming should recolor everything at once — without this, components with a `transition` on
// colors (e.g. button backgrounds) lag behind the instantly-updated surfaces.
const MUTE_TRANSITIONS_CLASS = "ds-transitions-muted";
let muteStyleInjected = false;
let unmuteTimer: ReturnType<typeof setTimeout> | undefined;
const muteTransitions = () => {
  if (!muteStyleInjected) {
    const style = document.createElement("style");
    style.textContent = `.${MUTE_TRANSITIONS_CLASS}, .${MUTE_TRANSITIONS_CLASS} * { transition: none !important; }`;
    document.head.appendChild(style);
    muteStyleInjected = true;
  }
  document.documentElement.classList.add(MUTE_TRANSITIONS_CLASS);
  clearTimeout(unmuteTimer);
  unmuteTimer = setTimeout(() => document.documentElement.classList.remove(MUTE_TRANSITIONS_CLASS), 150);
};

// Generates the design-system palette from the accent colour + the resolved light/dark mode and injects
// it onto the document root as `--ds-*` CSS variables. Returns the palette.
export const applyDesignSystemTokens = (accent: OklchColor, mode: Mode): Palette => {
  const palette = buildPalette(accent, mode, detectGamut());
  const root = document.documentElement;
  muteTransitions();
  for (const [key, value] of Object.entries(tokensToCssVars(palette))) {
    root.style.setProperty(key, value);
  }

  return palette;
};
