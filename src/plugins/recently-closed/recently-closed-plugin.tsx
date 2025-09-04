import type { AnoriPlugin, WidgetDescriptor, WidgetRenderProps } from "@anori/utils/user-data/types";
import "./styles.scss";
import { Icon } from "@anori/components/Icon";
import { RelativeTime } from "@anori/components/RelativeTime";
import { RequirePermissions } from "@anori/components/RequirePermissions";
import { ScrollArea } from "@anori/components/ScrollArea";
import { translate } from "@anori/translations/index";
import { useWidgetInteractionTracker } from "@anori/utils/analytics";
import { wait } from "@anori/utils/misc";
import { m, useAnimationControls } from "framer-motion";
import moment from "moment-timezone";
import { useMemo, useState } from "react";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import browser from "webextension-polyfill";

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
      className="Session"
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
      {!!favIcon && <img className="fav-icon" src={favIcon} aria-hidden />}
      {!favIcon && <Icon icon={session.tab ? "ic:baseline-tab" : "ic:outline-window"} width={18} />}
      <div className="title">
        {session.tab
          ? session.tab.title || t("recently-closed-plugin.tab")
          : session.window?.title || t("recently-closed-plugin.window")}
      </div>
      <div className="last-modified">
        {session.lastModified !== 0 && <RelativeTime m={lastModified} withoutSuffix />}
      </div>
    </m.div>
  );
};

const WidgetScreen = ({ instanceId }: WidgetRenderProps) => {
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
    <div className="RecentlyClosedWidget">
      <h2>{t("recently-closed-plugin.widgetTitle")}</h2>
      <ScrollArea className="sessions-list" color="dark" type="hover">
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

const widgetDescriptor = {
  id: "recently-closed-widget",
  get name() {
    return translate("recently-closed-plugin.name");
  },
  appearance: {
    resizable: {
      min: { width: 2, height: 2 },
      max: { width: 5, height: 4 },
    },
    size: {
      width: 2,
      height: 2,
    },
  },
  configurationScreen: null,
  mainScreen: (props) => (
    <RequirePermissions permissions={["sessions", "tabs"]}>
      <WidgetScreen {...props} />
    </RequirePermissions>
  ),
  mock: () => <WidgetScreen config={{}} instanceId="mock" />,
} satisfies WidgetDescriptor;

export const recentlyClosedPlugin = {
  id: "recently-closed-plugin",
  get name() {
    return translate("recently-closed-plugin.name");
  },
  widgets: [widgetDescriptor],
  configurationScreen: null,
} satisfies AnoriPlugin;
