import { setPageTitle } from "@anori/utils/page";
import { mountPage } from "@anori/utils/react";
import "./styles.scss";
import { performSync } from "@anori/cloud-integration/sync-manager";
import { BookmarksBar, scheduleLazyComponentsPreload } from "@anori/components/lazy-components";
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
import { DirectionProvider } from "@radix-ui/react-direction";
import clsx from "clsx";
import { AnimatePresence, LazyMotion, MotionConfig, m } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { FolderContent } from "./components/FolderContent";
import { Sidebar } from "./components/Sidebar";

const loadMotionFeatures = () => import("@anori/utils/motion/framer-motion-features").then(({ domMax }) => domMax);

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
        <AnimatePresence>
          <m.div
            className={clsx("StartPage", `${sidebarOrientation}-sidebar`, showBookmarksBar && "with-bookmarks-bar")}
            key="start-page"
          >
            {showBookmarksBar && (
              <BookmarksBar lazyOptions={{ fallback: <div className="bookmarks-bar-placeholder" /> }} />
            )}
            <div className={clsx("start-page-content")}>
              <Sidebar
                folders={folders}
                activeFolder={activeFolder}
                orientation={sidebarOrientation}
                onFolderClick={(f) => {
                  setActiveFolder(f);
                  if (rememberLastFolder) setLastFolder(f.id);
                }}
              />

              <div className="widgets-area">
                <FolderContent key={activeFolder.id} folder={activeFolder} animationDirection={animationDirection} />
              </div>
            </div>
          </m.div>
        </AnimatePresence>
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
      ,
    </StorageContext.Provider>,
  );
});

if (IS_TOUCH_DEVICE) document.body.classList.add("is-touch-device");
if (IS_ANDROID) document.body.classList.add("is-android");

if (X_MODE === "development" && !window.location.pathname.endsWith("start-debug.html")) {
  const debugUrl = window.location.href.replace("start.html", "start-debug.html");
  console.log("Profiler-enabled version of page is available at", debugUrl);
}
