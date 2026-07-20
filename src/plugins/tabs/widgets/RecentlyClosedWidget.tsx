import { RelativeTime } from "@anori/components/RelativeTime";
import { WidgetHeader } from "@anori/components/WidgetHeader/WidgetHeader";
import { builtinIcons } from "@anori/design-system/components/Icon/builtin-icons";
import { Icon } from "@anori/design-system/components/Icon/Icon";
import { ListItem } from "@anori/design-system/components/ListItem/ListItem";
import { ScrollArea } from "@anori/design-system/components/ScrollArea/ScrollArea";
import { useWidgetInteractionTracker } from "@anori/utils/analytics";
import type { WidgetRenderProps } from "@anori/utils/plugins/define";
import type { EmptyObject } from "@anori/utils/types";
import moment from "moment-timezone";
import { memo, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { css } from "styled-system/css";
import browser from "webextension-polyfill";

const widget = css({ display: "flex", flexDirection: "column", overflow: "hidden" });
const sessionsList = css({ flexGrow: 1, minHeight: 0 });
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

const Session = ({ session }: { session: browser.Sessions.Session; isMock: boolean }) => {
  const restore = async () => {
    trackInteraction("Restore tab");
    await browser.sessions.restore(session.tab ? session.tab.sessionId : session.window?.sessionId);
    window.close();
  };
  const { t, i18n } = useTranslation();
  const favIcon = session.tab ? session.tab.favIconUrl : "";
  const trackInteraction = useWidgetInteractionTracker();
  // TODO: probably should refactor this so dependencies are explicit?
  // biome-ignore lint/correctness/useExhaustiveDependencies: we use i18n as reactive proxy for current locale which affect some of functions outside of components
  const lastModified = useMemo(() => {
    if (X_BROWSER === "chrome") return moment.unix(session.lastModified);
    return moment(session.lastModified);
  }, [session.lastModified, i18n.language]);

  return (
    <ListItem as="button" onClick={restore}>
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
    </ListItem>
  );
};

export const RecentlyClosedWidget = memo(function RecentlyClosedWidget({ instanceId }: WidgetRenderProps<EmptyObject>) {
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
      <WidgetHeader title={t("recently-closed-plugin.widgetTitle")} />
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
});
