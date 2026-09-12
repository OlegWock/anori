import { incrementDailyUsageMetric } from "@anori/utils/analytics";
import { useHotkeys, useMirrorStateToRef, usePrevious } from "@anori/utils/hooks";
import type { Folder } from "@anori/utils/user-data/types";
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

const useAltWheelFolderSwitch = ({
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

export type FolderSwitchAnimationDirection = "up" | "down" | "left" | "right" | null;

const FOLDER_INDEX_HOTKEYS = ["alt+1", "alt+2", "alt+3", "alt+4", "alt+5", "alt+6", "alt+7", "alt+8", "alt+9"];

export const useFolderNavigation = ({
  folders,
  activeFolder,
  setActiveFolder,
  orientation,
  isRtl,
}: {
  folders: Folder[];
  activeFolder: Folder;
  setActiveFolder: (folder: Folder) => void;
  orientation: "vertical" | "horizontal";
  isRtl: boolean;
}) => {
  const activeFolderIndex = Math.max(
    0,
    folders.findIndex((f) => f.id === activeFolder.id),
  );

  const switchToFolderByIndex = (index: number) => {
    if (index >= folders.length) return;
    setActiveFolder(folders[index]);
  };

  const switchToPreviousFolder = () => {
    switchToFolderByIndex(activeFolderIndex === 0 ? folders.length - 1 : activeFolderIndex - 1);
  };

  const switchToNextFolder = () => {
    switchToFolderByIndex(activeFolderIndex === folders.length - 1 ? 0 : activeFolderIndex + 1);
  };

  const switchFolderLeft = isRtl ? switchToNextFolder : switchToPreviousFolder;
  const switchFolderRight = isRtl ? switchToPreviousFolder : switchToNextFolder;

  useHotkeys("meta+up, alt+up", () => switchToPreviousFolder());
  useHotkeys("meta+left, alt+left", () => switchFolderLeft());
  useHotkeys("meta+down, alt+down", () => switchToNextFolder());
  useHotkeys("meta+right, alt+right", () => switchFolderRight());
  useHotkeys(FOLDER_INDEX_HOTKEYS, (_event, handler) => {
    const index = Number(handler.keys?.[0]) - 1;
    if (Number.isInteger(index) && index >= 0) switchToFolderByIndex(index);
  });

  useAltWheelFolderSwitch({
    orientation,
    isRtl,
    activeFolderIndex,
    foldersCount: folders.length,
    switchToFolderByIndex,
  });

  const previousActiveFolderIndex = usePrevious(activeFolderIndex);
  let animationDirection: FolderSwitchAnimationDirection = null;
  if (previousActiveFolderIndex !== undefined && previousActiveFolderIndex !== activeFolderIndex) {
    const movedForward = activeFolderIndex > previousActiveFolderIndex;
    if (orientation === "vertical") {
      animationDirection = movedForward ? "down" : "up";
    } else {
      animationDirection = movedForward !== isRtl ? "right" : "left";
    }
  }

  return { animationDirection };
};
