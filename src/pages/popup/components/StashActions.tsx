import { Card } from "@anori/design-system/components/Card/Card";
import { builtinIcons } from "@anori/design-system/components/Icon/builtin-icons";
import { Favicon } from "@anori/design-system/components/Icon/Favicon";
import { RequirePermissions } from "@anori/design-system/components/RequirePermissions/RequirePermissions";
import {
  dateLabel,
  getActiveStashableTab,
  getGroupLinks,
  getNamedGroups,
  getStashableTabs,
  getWindowLinks,
  type NamedGroup,
  type OpenTab,
  tabToLink,
} from "@anori/plugins/tabs/capture";
import { DEFAULT_STASH_ID } from "@anori/plugins/tabs/consts";
import { sendMessage } from "@anori/plugins/tabs/messaging";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { iconOf, list, Row, SectionHeading } from "./PopupRow";

const MAX_TABS_BEFORE_COLLAPSE = 4;
const COLLAPSED_TAB_COUNT = 3;

const StashTabSection = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<OpenTab | null>(null);
  const [tabs, setTabs] = useState<OpenTab[]>([]);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    getActiveStashableTab().then(setActiveTab);
    getStashableTabs().then(setTabs);
  }, []);

  const otherTabs = useMemo(() => tabs.filter((tab) => tab.id !== activeTab?.id), [tabs, activeTab]);
  const showToggle = otherTabs.length > MAX_TABS_BEFORE_COLLAPSE;
  const visible = expanded || !showToggle ? otherTabs : otherTabs.slice(0, COLLAPSED_TAB_COUNT);

  const stashTab = async (tab: OpenTab) => {
    await sendMessage("stashLinks", { stashId: DEFAULT_STASH_ID, links: [tabToLink(tab)] });
    window.close();
  };

  return (
    <div className={list}>
      {activeTab && (
        <Row
          icon={iconOf(builtinIcons.add)}
          title={t("tabs-plugin.popup.stashCurrentTab")}
          onClick={() => stashTab(activeTab)}
        />
      )}
      <div className={list}>
        {visible.map((tab) => (
          <Row
            key={tab.id}
            icon={
              <Favicon url={tab.url} useFaviconApiIfPossible width={18} height={18} fallback={builtinIcons.globe} />
            }
            title={tab.title || tab.url}
            onClick={() => stashTab(tab)}
          />
        ))}
      </div>
      {!expanded && showToggle && (
        <Row
          icon={iconOf(builtinIcons.chevronDown)}
          title={t("tabs-plugin.stash.showAllTabs")}
          onClick={() => setExpanded(true)}
        />
      )}
    </div>
  );
};

const StashGroupSection = () => {
  const { t } = useTranslation();
  const [groups, setGroups] = useState<NamedGroup[]>([]);

  useEffect(() => {
    getNamedGroups().then(setGroups);
  }, []);

  if (groups.length === 0) return null;

  const stashGroup = async (group: NamedGroup) => {
    const links = await getGroupLinks(group.id);
    if (links.length === 0) return;
    await sendMessage("stashGroup", { stashId: DEFAULT_STASH_ID, name: group.title, links });
    window.close();
  };

  return (
    <>
      <SectionHeading>{t("tabs-plugin.popup.stashGroup")}</SectionHeading>
      <div className={list}>
        {groups.map((group) => (
          <Row
            key={group.id}
            icon={iconOf(builtinIcons.folder)}
            title={group.title}
            onClick={() => stashGroup(group)}
          />
        ))}
      </div>
    </>
  );
};

const TabActions = () => {
  const { t } = useTranslation();

  const stashWindow = async () => {
    const links = await getWindowLinks();
    if (links.length === 0) return;
    await sendMessage("stashGroup", {
      stashId: DEFAULT_STASH_ID,
      name: `${t("tabs-plugin.popup.window")} · ${dateLabel()}`,
      links,
    });
    window.close();
  };

  return (
    <>
      <StashTabSection />
      <StashGroupSection />
      <div className={list}>
        <Row icon={iconOf(builtinIcons.tabsFill)} title={t("tabs-plugin.popup.stashWindow")} onClick={stashWindow} />
      </div>
    </>
  );
};

export const StashActions = () => {
  const { t } = useTranslation();
  return (
    <Card gap="1" padding="2">
      <SectionHeading>{t("tabs-plugin.popup.stashTab")}</SectionHeading>
      <RequirePermissions
        permissions={["tabs"]}
        variant="list-item"
        additionalInfo={t("tabs-plugin.popup.grantTabs")}
        onRequestStart={() => {
          if (X_BROWSER === "firefox") window.close();
        }}
      >
        <TabActions />
      </RequirePermissions>
    </Card>
  );
};
