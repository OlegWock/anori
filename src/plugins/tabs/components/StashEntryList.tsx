import { Badge } from "@anori/design-system/components/Badge/Badge";
import { builtinIcons } from "@anori/design-system/components/Icon/builtin-icons";
import { Favicon } from "@anori/design-system/components/Icon/Favicon";
import { Icon } from "@anori/design-system/components/Icon/Icon";
import { IconButton } from "@anori/design-system/components/IconButton/IconButton";
import { Input } from "@anori/design-system/components/Input/Input";
import { ListItem } from "@anori/design-system/components/ListItem/ListItem";
import { isModifiedClick, parseHost } from "@anori/utils/misc";
import type { StashEntry, StashGroupEntry, StashLink } from "@anori/utils/storage";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { css } from "styled-system/css";
import { sendMessage } from "../messaging";

export type StashOpenHandlers = {
  // Only needed to override the plain-click default of the link (e.g. open a new tab and close the
  // popup). Omit it where a plain click should just navigate the current tab.
  openLink?: (url: string) => void;
  openAll: (links: StashLink[]) => void;
};

const entryRow = css({
  position: "relative",
  overflow: "hidden",
  "&:hover .stash-entry-actions": { opacity: 1, pointerEvents: "auto" },
});
const entryMain = css({
  display: "flex",
  alignItems: "center",
  gap: "4",
  flex: 1,
  minWidth: 0,
  border: "none",
  background: "transparent",
  textAlign: "left",
  cursor: "pointer",
  color: "text.primary",
  textDecoration: "none",
});
const entryTitle = css({
  flex: 1,
  minWidth: 0,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  fontSize: "sm",
});
const entryHost = css({ fontSize: "xs", color: "text.subtle", whiteSpace: "nowrap" });

const actions = css({
  position: "absolute",
  top: 0,
  bottom: 0,
  right: 0,
  display: "flex",
  alignItems: "center",
  gap: "0-5",
  paddingLeft: "5",
  paddingRight: "1-5",
  // The hover mask hides the clipped title under the action buttons.
  background:
    "linear-gradient(to right, transparent, token(colors.ghost.hover) 40%), linear-gradient(to right, transparent, token(colors.surface) 40%)",
  opacity: 0,
  pointerEvents: "none",
});
const groupBody = css({ display: "flex", flexDirection: "column", paddingLeft: "5" });
const groupNameInput = css({ flex: 1 });

const RemoveButton = ({ onClick }: { onClick: () => void }) => {
  const { t } = useTranslation();
  return (
    <IconButton
      icon={builtinIcons.trash}
      label={t("tabs-plugin.stash.remove")}
      variant="ghost"
      size="compact"
      onClick={onClick}
    />
  );
};

const LinkRow = ({
  entry,
  showHost,
  handlers,
}: {
  entry: Extract<StashEntry, { type: "link" }>;
  showHost: boolean;
  handlers: StashOpenHandlers;
}) => {
  const { openLink } = handlers;
  return (
    <ListItem className={entryRow}>
      <a
        className={entryMain}
        href={entry.url}
        onClick={
          openLink
            ? (e) => {
                if (isModifiedClick(e)) return;
                e.preventDefault();
                openLink(entry.url);
              }
            : undefined
        }
      >
        <Favicon url={entry.url} useFaviconApiIfPossible width={18} height={18} fallback={builtinIcons.globe} />
        <span className={entryTitle}>{entry.title || entry.url}</span>
        {showHost && <span className={entryHost}>{parseHost(entry.url)}</span>}
      </a>
      <div className={`${actions} stash-entry-actions`}>
        <RemoveButton onClick={() => sendMessage("removeEntry", { entryId: entry.id })} />
      </div>
    </ListItem>
  );
};

const GroupLinkRow = ({
  link,
  showHost,
  onRemove,
  handlers,
}: {
  link: StashLink;
  showHost: boolean;
  onRemove: () => void;
  handlers: StashOpenHandlers;
}) => {
  const { openLink } = handlers;
  return (
    <ListItem className={entryRow}>
      <a
        className={entryMain}
        href={link.url}
        onClick={
          openLink
            ? (e) => {
                if (isModifiedClick(e)) return;
                e.preventDefault();
                openLink(link.url);
              }
            : undefined
        }
      >
        <Favicon url={link.url} useFaviconApiIfPossible width={18} height={18} fallback={builtinIcons.globe} />
        <span className={entryTitle}>{link.title || link.url}</span>
        {showHost && <span className={entryHost}>{parseHost(link.url)}</span>}
      </a>
      <div className={`${actions} stash-entry-actions`}>
        <RemoveButton onClick={onRemove} />
      </div>
    </ListItem>
  );
};

const GroupRow = ({
  entry,
  showHost,
  handlers,
}: {
  entry: StashGroupEntry;
  showHost: boolean;
  handlers: StashOpenHandlers;
}) => {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const [editingName, setEditingName] = useState<string | null>(null);

  const commitRename = async () => {
    if (editingName?.trim()) {
      await sendMessage("renameGroup", { entryId: entry.id, name: editingName.trim() });
    }
    setEditingName(null);
  };

  return (
    <div>
      <ListItem className={entryRow}>
        <button type="button" className={entryMain} onClick={() => setExpanded((v) => !v)}>
          <Icon
            icon={expanded ? builtinIcons.chevronDown : builtinIcons.chevronForward}
            width={16}
            height={16}
            color="icon.subtle"
          />
          {editingName === null ? (
            <>
              <span className={entryTitle}>{entry.name}</span>
              <Badge>{t("tabs-plugin.stash.tabCount", { count: entry.links.length })}</Badge>
            </>
          ) : (
            <Input
              className={groupNameInput}
              value={editingName}
              onValueChange={setEditingName}
              onBlur={commitRename}
              onFocus={(e) => e.currentTarget.select()}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitRename();
                if (e.key === "Escape") setEditingName(null);
              }}
              onClick={(e) => e.stopPropagation()}
              autoFocus
            />
          )}
        </button>
        <div className={`${actions} stash-entry-actions`}>
          <IconButton
            icon={builtinIcons.openOutline}
            label={t("tabs-plugin.stash.openAll")}
            variant="ghost"
            size="compact"
            onClick={() => handlers.openAll(entry.links)}
          />
          <IconButton
            icon={builtinIcons.pencil}
            label={t("tabs-plugin.stash.rename")}
            variant="ghost"
            size="compact"
            onClick={() => setEditingName(entry.name)}
          />
          <RemoveButton onClick={() => sendMessage("removeEntry", { entryId: entry.id })} />
        </div>
      </ListItem>
      {expanded && (
        <div className={groupBody}>
          {entry.links.map((link, index) => (
            <GroupLinkRow
              key={`${link.url}-${index}`}
              link={link}
              showHost={showHost}
              handlers={handlers}
              onRemove={() => sendMessage("removeGroupLink", { entryId: entry.id, linkIndex: index })}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const StashEntryList = ({
  entries,
  showHost,
  handlers,
}: {
  entries: StashEntry[];
  showHost: boolean;
  handlers: StashOpenHandlers;
}) => {
  return (
    <>
      {entries.map((entry) =>
        entry.type === "group" ? (
          <GroupRow key={entry.id} entry={entry} showHost={showHost} handlers={handlers} />
        ) : (
          <LinkRow key={entry.id} entry={entry} showHost={showHost} handlers={handlers} />
        ),
      )}
    </>
  );
};
