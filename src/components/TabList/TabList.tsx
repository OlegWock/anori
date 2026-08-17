import { Badge } from "@anori/design-system/components/Badge/Badge";
import { builtinIcons } from "@anori/design-system/components/Icon/builtin-icons";
import { Favicon } from "@anori/design-system/components/Icon/Favicon";
import { Icon } from "@anori/design-system/components/Icon/Icon";
import { IconButton } from "@anori/design-system/components/IconButton/IconButton";
import { ListItem } from "@anori/design-system/components/ListItem/ListItem";
import type { TrackInteraction } from "@anori/utils/analytics";
import { isModifiedClick } from "@anori/utils/misc";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { css } from "styled-system/css";

const DEFAULT_COLLAPSE_AFTER = 3;

export type TabListTab = {
  id: string;
  url: string;
  title: string;
  href?: string;
  onClick?: () => void;
};

export type TabListGroup = {
  id: string;
  name: string;
  color?: string;
  tabs: TabListTab[];
  onOpenAll?: () => void;
};

export type TabListEntry = ({ type: "tab" } & TabListTab) | ({ type: "group" } & TabListGroup);

const root = css({ display: "flex", flexDirection: "column" });
const rowTitle = css({ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" });
const groupRow = css({
  position: "relative",
  overflow: "hidden",
  "&:hover .tab-list-actions": { opacity: 1, pointerEvents: "auto" },
});
const groupMain = css({
  display: "flex",
  alignItems: "center",
  gap: "3",
  flex: 1,
  minWidth: 0,
  border: "none",
  background: "transparent",
  textAlign: "left",
  cursor: "pointer",
  color: "text.primary",
  font: "inherit",
});
const groupDot = css({ width: "0-5rem", height: "0-5rem", borderRadius: "full", flexShrink: 0, background: "control" });
const groupActions = css({
  position: "absolute",
  top: 0,
  bottom: 0,
  right: 0,
  display: "flex",
  alignItems: "center",
  gap: "0-5",
  paddingLeft: "5",
  paddingRight: "1-5",
  background:
    "linear-gradient(to right, transparent, token(colors.ghost.hover) 40%), linear-gradient(to right, transparent, token(colors.surface) 40%)",
  opacity: 0,
  pointerEvents: "none",
});
const groupBody = css({ display: "flex", flexDirection: "column", paddingLeft: "5" });

const TabRow = ({ tab, trackInteraction }: { tab: TabListTab; trackInteraction?: TrackInteraction }) => {
  const inner = (
    <>
      {<Favicon url={tab.url} width={18} height={18} fallback={builtinIcons.globe} />}
      <span className={rowTitle}>{tab.title}</span>
    </>
  );

  if (tab.href !== undefined) {
    const { onClick } = tab;
    return (
      <ListItem
        as="a"
        href={tab.href}
        onClick={(e) => {
          trackInteraction?.("Open tab");
          if (!onClick || isModifiedClick(e)) return;
          e.preventDefault();
          onClick();
        }}
      >
        {inner}
      </ListItem>
    );
  }
  return (
    <ListItem
      as="button"
      type="button"
      onClick={() => {
        trackInteraction?.("Open tab");
        tab.onClick?.();
      }}
    >
      {inner}
    </ListItem>
  );
};

const GroupRow = ({ group, trackInteraction }: { group: TabListGroup; trackInteraction?: TrackInteraction }) => {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);

  const handleOpenAll = () => {
    trackInteraction?.("Open all in group");
    group.onOpenAll?.();
  };

  return (
    <div>
      <ListItem className={groupRow}>
        <button type="button" className={groupMain} onClick={() => setExpanded((value) => !value)}>
          <Icon
            icon={expanded ? builtinIcons.chevronDown : builtinIcons.chevronForward}
            width={16}
            height={16}
            color="icon.subtle"
          />
          {group.color && <span className={groupDot} style={{ background: group.color }} />}
          <span className={rowTitle}>{group.name}</span>
          <Badge>{t("tabs-plugin.stash.tabCount", { count: group.tabs.length })}</Badge>
        </button>
        {group.onOpenAll && (
          <div className={`${groupActions} tab-list-actions`}>
            <IconButton
              icon={builtinIcons.openOutline}
              label={t("tabs-plugin.stash.openAll")}
              variant="ghost"
              size="compact"
              onClick={handleOpenAll}
            />
          </div>
        )}
      </ListItem>
      {expanded && (
        <div className={groupBody}>
          {group.tabs.map((tab) => (
            <TabRow key={tab.id} tab={tab} trackInteraction={trackInteraction} />
          ))}
        </div>
      )}
    </div>
  );
};

export const TabList = ({
  entries,
  collapsible = true,
  collapseAfter = DEFAULT_COLLAPSE_AFTER,
  trackInteraction,
}: {
  entries: TabListEntry[];
  collapsible?: boolean;
  collapseAfter?: number;
  trackInteraction?: TrackInteraction;
}) => {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);

  // Collapse only when it actually hides a row beyond the "Show all" row it adds.
  const collapsed = collapsible && entries.length > collapseAfter + 1 ? entries.slice(0, collapseAfter) : entries;
  const showToggle = collapsed.length < entries.length;
  const visible = expanded ? entries : collapsed;

  return (
    <div className={root}>
      {visible.map((entry) =>
        entry.type === "group" ? (
          <GroupRow key={entry.id} group={entry} trackInteraction={trackInteraction} />
        ) : (
          <TabRow key={entry.id} tab={entry} trackInteraction={trackInteraction} />
        ),
      )}
      {!expanded && showToggle && (
        <ListItem as="button" type="button" onClick={() => setExpanded(true)}>
          <Icon icon={builtinIcons.chevronDown} width={18} color="icon" />
          <span className={rowTitle}>{t("tabs-plugin.stash.showAllTabs")}</span>
        </ListItem>
      )}
    </div>
  );
};
