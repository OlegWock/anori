import { setPageTitle } from "@anori/utils/page";
import { mountPage } from "@anori/utils/react";
import "../../panda.css";
import "./globals.css";
import { performSync } from "@anori/cloud-integration/sync-manager";
import { BookmarksBar, scheduleLazyComponentsPreload } from "@anori/components/lazy-components";
import { TooltipProvider } from "@anori/design-system/components/Tooltip/Tooltip";
import { languageDirections } from "@anori/translations/metadata";
import { initTranslation } from "@anori/translations/utils";
import { incrementDailyUsageMetric, plantPerformanceMetricsListeners } from "@anori/utils/analytics";
import { CompactModeProvider } from "@anori/utils/compact";
import { IS_ANDROID, IS_TOUCH_DEVICE } from "@anori/utils/device";
import { useHotkeys, useMirrorStateToRef, usePrevious } from "@anori/utils/hooks";
import { watchForPermissionChanges } from "@anori/utils/permissions";
import { QueryClientProvider } from "@anori/utils/react-query";
import { anoriSchema, getAnoriStorage } from "@anori/utils/storage";
import { StorageContext, useStorageValue } from "@anori/utils/storage-lib";
import { useFolders } from "@anori/utils/user-data/hooks";
import { watchForThemeUpdates } from "@anori/utils/user-data/theme";
import type { Folder } from "@anori/utils/user-data/types";
import { DirectionProvider } from "@radix-ui/react-direction";
import { AnimatePresence, LazyMotion, MotionConfig, m } from "framer-motion";
import { useCallback, useEffect, useMemo, useState } from "react";
import { css, cva } from "styled-system/css";
import { FolderContent } from "./components/FolderContent";
import { Sidebar } from "./components/Sidebar";

const loadMotionFeatures = () => import("@anori/utils/motion/framer-motion-features").then(({ domMax }) => domMax);

const startPage = css({ height: "100dvh", width: "100vw", display: "flex", flexDirection: "column" });
const startPageContent = cva({
  base: { display: "flex", flex: 1, overflow: "hidden" },
  variants: { orientation: { vertical: {}, horizontal: { flexDirection: "column-reverse" } } },
});
const widgetsArea = cva({
  base: {
    position: "relative",
    flex: 1,
    borderRadius: "2xl",
    background: "frosted.subtle",
    backdropFilter: "blur(10px)",
    zIndex: 1,
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    minWidth: 0,
  },
  variants: {
    orientation: {
      vertical: { marginBlock: "8", marginInlineStart: 0, marginInlineEnd: "8" },
      horizontal: { marginTop: "8", marginInline: "8", marginBottom: 0 },
    },
    // The bookmarks bar takes the top, so tighten the widgets-area top margin. `!` to win over orientation.
    bookmarksBar: { true: { marginTop: "1!" } },
  },
});
const bookmarksBarPlaceholder = css({
  marginTop: "4",
  marginInline: "8",
  marginBottom: 0,
  height: "calc(0.9rem * 1.2 + 1.55rem)",
});

const useSidebarOrientation = () => {
  const [sidebarOrientation] = useStorageValue(anoriSchema.sidebarOrientation);
  const [winOrientation, setWinOrientation] = useState<"landscape" | "portrait">(() =>
    window.innerWidth >= window.innerHeight ? "landscape" : "portrait",
  );
  const winOrientationRef = useMirrorStateToRef(winOrientation);
  const computedSidebarOrientation =
    sidebarOrientation === "auto" ? (winOrientation === "landscape" ? "vertical" : "horizontal") : sidebarOrientation;

  useEffect(() => {
    if (sidebarOrientation === "auto") {
      const handler = () => {
        const newOrientation = window.innerWidth >= window.innerHeight ? "landscape" : "portrait";
        if (newOrientation !== winOrientationRef.current) {
          setWinOrientation(newOrientation);
        }
      };

      window.addEventListener("resize", handler);
      handler();
      return () => window.removeEventListener("resize", handler);
    }
  }, [sidebarOrientation]);

  return computedSidebarOrientation;
};

const Start = () => {
  const switchToFolderByIndex = (ind: number) => {
    if (ind >= folders.length) return;
    setActiveFolder(folders[ind]);
  };

  const swithFolderUp = () => {
    setActiveFolder(folders[activeFolderIndex === 0 ? folders.length - 1 : activeFolderIndex - 1]);
  };

  const swithFolderDown = () => {
    setActiveFolder(folders[activeFolderIndex === folders.length - 1 ? 0 : activeFolderIndex + 1]);
  };

  const sidebarOrientation = useSidebarOrientation();
  const [rememberLastFolder] = useStorageValue(anoriSchema.rememberLastFolder);
  const [lastFolder, setLastFolder] = useStorageValue(anoriSchema.lastFolder);
  const [language] = useStorageValue(anoriSchema.language);
  const dir = useMemo(() => languageDirections[language], [language]);
  const { folders, activeFolder, setActiveFolder } = useFolders({
    includeHome: true,
    defaultFolderId: rememberLastFolder ? lastFolder : undefined,
  });
  const onFolderClick = useCallback(
    (f: Folder) => {
      setActiveFolder(f);
      if (rememberLastFolder) setLastFolder(f.id);
    },
    [setActiveFolder, rememberLastFolder, setLastFolder],
  );
  const activeFolderIndex = folders.findIndex((f) => f.id === activeFolder.id) ?? 0;
  const previousActiveFolderIndex = usePrevious(activeFolderIndex);
  const animationDirection =
    previousActiveFolderIndex === undefined || previousActiveFolderIndex === activeFolderIndex
      ? null
      : activeFolderIndex > previousActiveFolderIndex
        ? sidebarOrientation === "vertical"
          ? "down"
          : "right"
        : sidebarOrientation === "vertical"
          ? "up"
          : "left";

  const [showBookmarksBar] = useStorageValue(anoriSchema.showBookmarksBar);

  useHotkeys("meta+up, alt+up", () => swithFolderUp());
  useHotkeys("meta+left, alt+left", () => swithFolderUp());
  useHotkeys("meta+down, alt+down", () => swithFolderDown());
  useHotkeys("meta+right, alt+right", () => swithFolderDown());

  useHotkeys("alt+1", () => switchToFolderByIndex(0));
  useHotkeys("alt+2", () => switchToFolderByIndex(1));
  useHotkeys("alt+3", () => switchToFolderByIndex(2));
  useHotkeys("alt+4", () => switchToFolderByIndex(3));
  useHotkeys("alt+5", () => switchToFolderByIndex(4));
  useHotkeys("alt+6", () => switchToFolderByIndex(5));
  useHotkeys("alt+7", () => switchToFolderByIndex(6));
  useHotkeys("alt+8", () => switchToFolderByIndex(7));
  useHotkeys("alt+9", () => switchToFolderByIndex(8));

  return (
    <DirectionProvider dir={dir}>
      <MotionConfig transition={{ duration: 0.2, ease: "easeInOut" }}>
        <TooltipProvider delay={200} closeDelay={100} timeout={0}>
          <AnimatePresence>
            <m.div className={startPage} key="start-page">
              {showBookmarksBar && (
                <BookmarksBar lazyOptions={{ fallback: <div className={bookmarksBarPlaceholder} /> }} />
              )}
              <div className={startPageContent({ orientation: sidebarOrientation })}>
                <Sidebar
                  folders={folders}
                  activeFolder={activeFolder}
                  orientation={sidebarOrientation}
                  bookmarksBarVisible={showBookmarksBar}
                  onFolderClick={onFolderClick}
                />

                <div className={widgetsArea({ orientation: sidebarOrientation, bookmarksBar: showBookmarksBar })}>
                  <FolderContent key={activeFolder.id} folder={activeFolder} animationDirection={animationDirection} />
                </div>
              </div>
            </m.div>
          </AnimatePresence>
        </TooltipProvider>
      </MotionConfig>
    </DirectionProvider>
  );
};

watchForPermissionChanges();

getAnoriStorage().then((storage) => {
  initTranslation();
  const title = storage.get(anoriSchema.newTabTitle);
  setPageTitle(title);

  storage.files.get(anoriSchema.customIcons.all()); // This preloads custom icon blobs into cache

  const showBookmarksBar = storage.get(anoriSchema.showBookmarksBar);
  if (showBookmarksBar) {
    BookmarksBar.preload();
  }

  const showLoadAnimation = storage.get(anoriSchema.showLoadAnimation);
  const div = document.querySelector(".loading-cover");
  if (div) {
    if (!showLoadAnimation) {
      div.remove();
    } else {
      div.addEventListener("animationend", () => div.remove());
      div.classList.add("active");
    }
  }

  watchForThemeUpdates(storage);

  performSync(storage);

  plantPerformanceMetricsListeners();
  scheduleLazyComponentsPreload();
  incrementDailyUsageMetric("Times new tab opened");
  mountPage(
    <StorageContext.Provider value={storage}>
      <QueryClientProvider>
        <CompactModeProvider>
          {/* strict mode temporary disabled due to strict https://github.com/framer/motion/issues/2094 */}
          <LazyMotion features={loadMotionFeatures}>
            <Start />
          </LazyMotion>
        </CompactModeProvider>
      </QueryClientProvider>
    </StorageContext.Provider>,
  );
});

if (IS_TOUCH_DEVICE) document.body.classList.add("is-touch-device");
if (IS_ANDROID) document.body.classList.add("is-android");

if (X_MODE === "development" && !window.location.pathname.endsWith("start-debug.html")) {
  const debugUrl = window.location.href.replace("start.html", "start-debug.html");
  console.log("Profiler-enabled version of page is available at", debugUrl);
}
