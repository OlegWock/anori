import { RelativeTime } from "@anori/components/RelativeTime";
import { builtinIcons } from "@anori/design-system/components/Icon/builtin-icons";
import { Icon } from "@anori/design-system/components/Icon/Icon";
import { ScrollArea } from "@anori/design-system/components/ScrollArea/ScrollArea";
import { useWidgetInteractionTracker } from "@anori/utils/analytics";
import { wait } from "@anori/utils/misc";
import type { WidgetRenderProps } from "@anori/utils/plugins/types";
import type { EmptyObject } from "@anori/utils/types";
import { m, useAnimationControls } from "framer-motion";
import moment from "moment-timezone";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { css } from "styled-system/css";
import browser from "webextension-polyfill";

const widget = css({ display: "flex", flexDirection: "column", gap: "1-5", overflow: "hidden" });
const sessionsList = css({ flexGrow: 1, minHeight: 0 });
const sessionRow = css({
  display: "flex",
  alignItems: "center",
  gap: "4",
  padding: "1-5",
  cursor: "pointer",
  transition: "0.15s ease-in-out",
  borderRadius: "md",
  "& svg": { minWidth: "18px", maxWidth: "18px" },
  "@media (any-hover: hover)": { "&:hover": { background: "frosted" } },
});
const favIconImg = css({ width: "18px", borderRadius: "md" });
const sessionTitle = css({
  flexGrow: 1,
  flexShrink: 1,
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  overflow: "hidden",
  fontSize: "sm",
});
const lastModifiedText = css({
  fontSize: "2xs",
  color: "text.placeholder",
  whiteSpace: "nowrap",
  minWidth: "95px",
  textAlign: "end",
});

const Session = ({ session, isMock }: { session: browser.Sessions.Session; isMock: boolean }) => {
  const restore = async () => {
    controls.start("swipe", { duration: 0.1 });
    trackInteraction("Restore tab");
    await wait(100);
    if (isMock) {
      controls.set("reset");
    } else {
      await browser.sessions.restore(session.tab ? session.tab.sessionId : session.window?.sessionId);
      window.close();
    }
  };
  const { t, i18n } = useTranslation();
  const controls = useAnimationControls();
  const favIcon = session.tab ? session.tab.favIconUrl : "";
  const trackInteraction = useWidgetInteractionTracker();
  // TODO: probably should refactor this so dependencies are explicit?
  // biome-ignore lint/correctness/useExhaustiveDependencies: we use i18n as reactive proxy for current locale which affect some of functions outside of components
  const lastModified = useMemo(() => {
    if (X_BROWSER === "chrome") return moment.unix(session.lastModified);
    return moment(session.lastModified);
  }, [session.lastModified, i18n.language]);

  return (
    <m.div
      className={sessionRow}
      animate={controls}
      onClick={restore}
      variants={{
        swipe: {
          translateX: "65%",
          opacity: 0,
        },
        reset: {
          translateX: "0",
          opacity: 1,
        },
      }}
    >
      {!!favIcon && <img className={favIconImg} src={favIcon} aria-hidden />}
      {!favIcon && (
        <Icon
          icon={session.tab ? builtinIcons.recentlyClosedTabs.tab : builtinIcons.recentlyClosedTabs.window}
          width={18}
        />
      )}
      <div className={sessionTitle}>
        {session.tab
          ? session.tab.title || t("recently-closed-plugin.tab")
          : session.window?.title || t("recently-closed-plugin.window")}
      </div>
      <div className={lastModifiedText}>
        {session.lastModified !== 0 && <RelativeTime m={lastModified} withoutSuffix />}
      </div>
    </m.div>
  );
};

export const WidgetScreen = ({ instanceId }: WidgetRenderProps<EmptyObject>) => {
  const [sessions, setSessions] = useState<browser.Sessions.Session[]>([]);
  const { t } = useTranslation();

  useEffect(() => {
    const load = async () => {
      const results = await browser.sessions.getRecentlyClosed();
      setSessions(results);
    };
    load();

    const tid = setInterval(() => load(), 1000 * 30);
    browser.sessions.onChanged.addListener(load);
    return () => {
      browser.sessions.onChanged.removeListener(load);
      clearInterval(tid);
    };
  }, []);

  return (
    <div className={widget}>
      <h2>{t("recently-closed-plugin.widgetTitle")}</h2>
      <ScrollArea className={sessionsList} type="hover">
        {sessions
          .filter((s) => {
            const url = s.tab ? s.tab.url : "";
            if (
              url &&
              (url.includes("pages/newtab/start.html?focused") ||
                url.includes("chrome://newtab/") ||
                url.includes("edge://newtab/"))
            )
              return false;
            return true;
          })
          .map((s) => {
            const id = s.tab ? s.tab.sessionId : s.window?.sessionId;
            return <Session key={id?.toString()} session={s} isMock={instanceId === "mock"} />;
          })}
      </ScrollArea>
    </div>
  );
};
