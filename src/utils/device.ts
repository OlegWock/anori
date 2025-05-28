export const IS_TOUCH_DEVICE =
  (typeof window !== "undefined" && "ontouchstart" in window) ||
  (navigator.maxTouchPoints !== undefined && navigator.maxTouchPoints > 0);

export const IS_ANDROID = IS_TOUCH_DEVICE && navigator.userAgent.toLowerCase().includes("android");
