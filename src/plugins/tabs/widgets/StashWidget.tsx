import { WidgetHeader } from "@anori/components/WidgetHeader/WidgetHeader";
import { EmptyState } from "@anori/design-system/components/EmptyState/EmptyState";
import { builtinIcons } from "@anori/design-system/components/Icon/builtin-icons";
import { IconButton } from "@anori/design-system/components/IconButton/IconButton";
import { Popover } from "@anori/design-system/components/Popover/Popover";
import { ScrollArea } from "@anori/design-system/components/ScrollArea/ScrollArea";
import type { WidgetRenderProps } from "@anori/utils/plugins/define";
import { useWidgetMetadata } from "@anori/utils/plugins/widget";
import { anoriSchema } from "@anori/utils/storage";
import { useStorageCollectionAllValue } from "@anori/utils/storage-lib";
import { memo, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { css } from "styled-system/css";
import browser from "webextension-polyfill";
import { AddToStashPopover } from "../components/AddToStashPopover";
import { StashEntryList, type StashOpenHandlers } from "../components/StashEntryList";
import { DEFAULT_STASH_ID } from "../consts";
import type { StashWidgetConfig } from "../types";

const HOST_MIN_WIDTH = 3;

const widget = css({ display: "flex", flexDirection: "column", overflow: "hidden", height: "100%" });
const list = css({ flexGrow: 1, minHeight: 0 });
const emptyFill = css({ flexGrow: 1 });

const handlers: StashOpenHandlers = {
  openLink: (url) => {
    window.location.href = url;
  },
  openAll: (links) => {
    for (const link of links) browser.tabs.create({ url: link.url, active: false });
  },
};

export const StashWidget = memo(function StashWidget({ config }: WidgetRenderProps<StashWidgetConfig>) {
  const { t } = useTranslation();
  const {
    size: { width },
  } = useWidgetMetadata();
  const stashId = config.stashId ?? DEFAULT_STASH_ID;
  const allEntries = useStorageCollectionAllValue(anoriSchema.stashEntries.entry.all());
  const showHost = width >= HOST_MIN_WIDTH;

  const entries = useMemo(() => {
    return Object.values(allEntries)
      .filter((entry) => entry.stashId === stashId)
      .sort((a, b) => b.addedAt - a.addedAt);
  }, [allEntries, stashId]);

  return (
    <div className={widget}>
      <WidgetHeader
        title={t("tabs-plugin.stash.title")}
        action={
          <Popover component={AddToStashPopover} additionalData={{ stashId }}>
            <IconButton size="medium" icon={builtinIcons.add} label={t("tabs-plugin.stash.stashTab")} variant="ghost" />
          </Popover>
        }
      />
      {entries.length === 0 ? (
        <EmptyState
          className={emptyFill}
          title={t("tabs-plugin.stash.empty")}
          description={t("tabs-plugin.stash.emptyHint")}
        />
      ) : (
        <ScrollArea className={list} type="hover">
          <StashEntryList entries={entries} showHost={showHost} handlers={handlers} />
        </ScrollArea>
      )}
    </div>
  );
});
