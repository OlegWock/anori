import { buildIcon, getIcon, loadIcons } from "@iconify/react";

const REQUEST_DELAY_MS = 150;
const MAX_REQUEST_DELAY_MS = 500;

type SvgListener = (svgText: string) => void;

const listeners = new Map<string, Set<SvgListener>>();
let queuedIcons = new Set<string>();
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let firstQueuedAt = 0;

const getLoadedSvg = (icon: string): string | null => {
  const data = getIcon(icon);
  if (!data) return null;
  const { attributes, body } = buildIcon(data);
  const attributesText = Object.entries(attributes)
    .map(([name, value]) => `${name}="${value}"`)
    .join(" ");
  return `<svg xmlns="http://www.w3.org/2000/svg" ${attributesText}>${body}</svg>`;
};

const notifyLoaded = (icon: string) => {
  const iconListeners = listeners.get(icon);
  if (!iconListeners) return;
  const svgText = getLoadedSvg(icon);
  if (!svgText) return;
  listeners.delete(icon);
  for (const listener of iconListeners) listener(svgText);
};

const flushQueue = () => {
  flushTimer = null;
  const icons = [...queuedIcons].filter((icon) => listeners.has(icon));
  queuedIcons = new Set();
  if (icons.length === 0) return;

  loadIcons(icons, (loaded) => {
    for (const { prefix, name } of loaded) notifyLoaded(`${prefix}:${name}`);
  });
};

const scheduleFlush = () => {
  const now = Date.now();
  if (flushTimer === null) {
    firstQueuedAt = now;
  } else {
    clearTimeout(flushTimer);
  }
  const delay = Math.min(REQUEST_DELAY_MS, Math.max(0, firstQueuedAt + MAX_REQUEST_DELAY_MS - now));
  flushTimer = setTimeout(flushQueue, delay);
};

export const requestBatchedRemoteIcon = (icon: string, onLoaded: SvgListener): (() => void) => {
  const loadedSvg = getLoadedSvg(icon);
  if (loadedSvg) {
    onLoaded(loadedSvg);
    return () => {};
  }

  let iconListeners = listeners.get(icon);
  if (!iconListeners) {
    iconListeners = new Set();
    listeners.set(icon, iconListeners);
    queuedIcons.add(icon);
    scheduleFlush();
  }
  iconListeners.add(onLoaded);

  return () => {
    const current = listeners.get(icon);
    if (!current) return;
    current.delete(onLoaded);
    if (current.size === 0) {
      listeners.delete(icon);
      queuedIcons.delete(icon);
    }
  };
};
