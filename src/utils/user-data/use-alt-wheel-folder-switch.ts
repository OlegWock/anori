import { incrementDailyUsageMetric } from "@anori/utils/analytics";
import { useMirrorStateToRef } from "@anori/utils/hooks";
import { useEffect } from "react";

const WHEEL_FIRST_SWITCH_PX = 10;
const WHEEL_PX_PER_FOLDER = 150;
const WHEEL_GESTURE_RESET_MS = 400;
const WHEEL_DELTA_MODE_MULTIPLIER: Record<number, number> = { 0: 1, 1: 16, 2: 100 };

const foldersForScrollDistance = (distance: number) => {
  const magnitude = Math.abs(distance);
  if (magnitude < WHEEL_FIRST_SWITCH_PX) return 0;
  const count = 1 + Math.floor((magnitude - WHEEL_FIRST_SWITCH_PX) / WHEEL_PX_PER_FOLDER);
  return distance > 0 ? count : -count;
};

export const useAltWheelFolderSwitch = ({
  orientation,
  isRtl,
  activeFolderIndex,
  foldersCount,
  switchToFolderByIndex,
}: {
  orientation: "vertical" | "horizontal";
  isRtl: boolean;
  activeFolderIndex: number;
  foldersCount: number;
  switchToFolderByIndex: (index: number) => void;
}) => {
  const orientationRef = useMirrorStateToRef(orientation);
  const isRtlRef = useMirrorStateToRef(isRtl);
  const activeFolderIndexRef = useMirrorStateToRef(activeFolderIndex);
  const foldersCountRef = useMirrorStateToRef(foldersCount);
  const switchToFolderByIndexRef = useMirrorStateToRef(switchToFolderByIndex);

  useEffect(() => {
    let gestureStartIndex = 0;
    let gestureTargetIndex = 0;
    let gestureDistance = 0;
    let lastEventAt = 0;

    const handler = (e: WheelEvent) => {
      if (!e.altKey || e.ctrlKey || e.metaKey) return;
      e.preventDefault();

      const now = performance.now();
      if (now - lastEventAt > WHEEL_GESTURE_RESET_MS) {
        gestureStartIndex = activeFolderIndexRef.current;
        gestureTargetIndex = gestureStartIndex;
        gestureDistance = 0;
      }
      lastEventAt = now;

      const multiplier = WHEEL_DELTA_MODE_MULTIPLIER[e.deltaMode] ?? 1;
      const deltaX = isRtlRef.current ? -e.deltaX : e.deltaX;
      const alongSidebar = orientationRef.current === "vertical" ? e.deltaY : deltaX;
      const acrossSidebar = orientationRef.current === "vertical" ? deltaX : e.deltaY;
      gestureDistance += (alongSidebar !== 0 ? alongSidebar : acrossSidebar) * multiplier;

      const lastIndex = foldersCountRef.current - 1;
      const targetIndex = Math.min(
        lastIndex,
        Math.max(0, gestureStartIndex + foldersForScrollDistance(gestureDistance)),
      );
      if (targetIndex === gestureTargetIndex) return;
      gestureTargetIndex = targetIndex;
      switchToFolderByIndexRef.current(targetIndex);
      incrementDailyUsageMetric("Times hotkey used");
    };

    window.addEventListener("wheel", handler, { passive: false });
    return () => window.removeEventListener("wheel", handler);
  }, []);
};
