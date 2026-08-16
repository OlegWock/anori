import { Card } from "@anori/design-system/components/Card/Card";
import { EmptyState } from "@anori/design-system/components/EmptyState/EmptyState";
import { StashEntryList, type StashOpenHandlers } from "@anori/plugins/tabs/components/StashEntryList";
import { DEFAULT_STASH_ID } from "@anori/plugins/tabs/consts";
import { anoriSchema } from "@anori/utils/storage";
import { useStorageCollectionAllValue } from "@anori/utils/storage-lib";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { css } from "styled-system/css";
import browser from "webextension-polyfill";
import { list, SectionHeading } from "./PopupRow";

const emptyState = css({ paddingBlock: "4" });

const stashHandlers: StashOpenHandlers = {
  openLink: (url) => {
    browser.tabs.create({ url, active: true });
    window.close();
  },
  openAll: (links) => {
    for (const link of links) browser.tabs.create({ url: link.url, active: false });
    window.close();
  },
};

export const RecentlyStashed = () => {
  const { t } = useTranslation();
  const allEntries = useStorageCollectionAllValue(anoriSchema.stashEntries.entry.all());

  const recent = useMemo(() => {
    return Object.values(allEntries)
      .filter((entry) => entry.stashId === DEFAULT_STASH_ID)
      .sort((a, b) => b.addedAt - a.addedAt)
      .slice(0, 3);
  }, [allEntries]);

  return (
    <Card gap="1" padding="2">
      <SectionHeading>{t("tabs-plugin.popup.recentlyStashed")}</SectionHeading>
      {recent.length === 0 ? (
        <EmptyState className={emptyState} title={t("tabs-plugin.popup.nothingStashed")} muted compact />
      ) : (
        <div className={list}>
          <StashEntryList entries={recent} showHost handlers={stashHandlers} />
        </div>
      )}
    </Card>
  );
};
