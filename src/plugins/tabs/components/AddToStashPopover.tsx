import { Button } from "@anori/design-system/components/Button/Button";
import { builtinIcons } from "@anori/design-system/components/Icon/builtin-icons";
import { Favicon } from "@anori/design-system/components/Icon/Favicon";
import { Input } from "@anori/design-system/components/Input/Input";
import { ListItem } from "@anori/design-system/components/ListItem/ListItem";
import type { PopoverRenderProps } from "@anori/design-system/components/Popover/Popover";
import { RequirePermissions } from "@anori/design-system/components/RequirePermissions/RequirePermissions";
import { ScrollArea } from "@anori/design-system/components/ScrollArea/ScrollArea";
import { normalizeUrl, parseHost } from "@anori/utils/misc";
import type { StashLink } from "@anori/utils/storage";
import { type SubmitEvent, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { css } from "styled-system/css";
import { getStashableTabs, type OpenTab, tabToLink } from "../capture";
import { sendMessage } from "../messaging";

const container = css({ display: "flex", flexDirection: "column", gap: "3", width: "368px", maxWidth: "90vw" });
const urlForm = css({ display: "flex", gap: "2" });
const urlInput = css({ flexGrow: 1, minWidth: 0 });
const tabList = css({ maxHeight: "260px" });
const rowTitle = css({ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" });

const OpenTabsPicker = ({ stashId, onDone }: { stashId: string; onDone: () => void }) => {
  const [tabs, setTabs] = useState<OpenTab[]>([]);

  useEffect(() => {
    getStashableTabs().then(setTabs);
  }, []);

  const pick = async (tab: OpenTab) => {
    await sendMessage("stashLinks", { stashId, links: [tabToLink(tab)] });
    onDone();
  };

  return (
    <ScrollArea className={tabList} type="hover">
      {tabs.map((tab) => (
        <ListItem as="button" type="button" key={tab.id} onClick={() => pick(tab)}>
          <Favicon url={tab.url} useFaviconApiIfPossible width={18} height={18} fallback={builtinIcons.globe} />
          <span className={rowTitle}>{tab.title || tab.url}</span>
        </ListItem>
      ))}
    </ScrollArea>
  );
};

export const AddToStashPopover = ({ close, data }: PopoverRenderProps<{ stashId: string }>) => {
  const { t } = useTranslation();
  const [url, setUrl] = useState("");

  const submitUrl = async (e: SubmitEvent) => {
    e.preventDefault();
    const trimmed = url.trim();
    if (!trimmed) return;
    const normalized = normalizeUrl(trimmed);
    const link: StashLink = { url: normalized, title: parseHost(normalized) };
    await sendMessage("stashLinks", { stashId: data.stashId, links: [link] });
    close();
  };

  return (
    <div className={container}>
      <form className={urlForm} onSubmit={submitUrl}>
        <Input className={urlInput} value={url} onValueChange={setUrl} placeholder={t("tabs-plugin.stash.pasteUrl")} />
        <Button type="submit" iconStart={builtinIcons.add} disabled={!url.trim()}>
          {t("tabs-plugin.stash.add")}
        </Button>
      </form>
      <RequirePermissions permissions={["tabs"]}>
        <OpenTabsPicker stashId={data.stashId} onDone={close} />
      </RequirePermissions>
    </div>
  );
};
