import { Badge } from "@anori/design-system/components/Badge/Badge";
import { builtinIcons } from "@anori/design-system/components/Icon/builtin-icons";
import { Favicon } from "@anori/design-system/components/Icon/Favicon";
import { Icon } from "@anori/design-system/components/Icon/Icon";
import { IconButton } from "@anori/design-system/components/IconButton/IconButton";
import { ListItem } from "@anori/design-system/components/ListItem/ListItem";
import { isModifiedClick } from "@anori/utils/misc";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { css } from "styled-system/css";

const DEFAULT_COLLAPSE_AFTER = 3;

export type TabListTab = {
  id: string;
  url: string;
  title: string;
  // When set, the row is an anchor so middle/Cmd/Ctrl-click open the URL natively. Provide onClick
  // only to override the plain-click default (e.g. open in a new tab and close a popup); a link that
  // just navigates the current tab needs no onClick. Without href, onClick makes the row a button.
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

const favicon = (url: string) => (
  <Favicon url={url} useFaviconApiIfPossible width={18} height={18} fallback={builtinIcons.globe} />
);

const TabRow = ({ tab }: { tab: TabListTab }) => {
  const inner = (
    <>
      {favicon(tab.url)}
      <span className={rowTitle}>{tab.title}</span>
    </>
  );

  if (tab.href !== undefined) {
    const { onClick } = tab;
    return (
      <ListItem
        as="a"
        href={tab.href}
        onClick={
          onClick
            ? (e) => {
                if (isModifiedClick(e)) return;
                e.preventDefault();
                onClick();
              }
            : undefined
        }
      >
        {inner}
      </ListItem>
    );
  }
  return (
    <ListItem as="button" type="button" onClick={tab.onClick}>
      {inner}
    </ListItem>
  );
};

const GroupRow = ({ group }: { group: TabListGroup }) => {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);

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
              onClick={group.onOpenAll}
            />
          </div>
        )}
      </ListItem>
      {expanded && (
        <div className={groupBody}>
          {group.tabs.map((tab) => (
            <TabRow key={tab.id} tab={tab} />
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
}: {
  entries: TabListEntry[];
  collapsible?: boolean;
  collapseAfter?: number;
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
        entry.type === "group" ? <GroupRow key={entry.id} group={entry} /> : <TabRow key={entry.id} tab={entry} />,
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
