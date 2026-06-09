import { listItemAnimation } from "@anori/components/animations";
import { Alert } from "@anori/design-system/components/Alert/Alert";
import { Button } from "@anori/design-system/components/Button/Button";
import { Checkbox } from "@anori/design-system/components/Checkbox/Checkbox";
import { Field } from "@anori/design-system/components/Field/Field";
import { builtinIcons } from "@anori/design-system/components/Icon/builtin-icons";
import { Icon } from "@anori/design-system/components/Icon/Icon";
import { Input } from "@anori/design-system/components/Input/Input";
import { guid } from "@anori/utils/misc";
import type { WidgetConfigurationScreenProps } from "@anori/utils/plugins/types";
import { AnimatePresence, m } from "framer-motion";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { css } from "styled-system/css";
import type { RssFeedConfig } from "../types";

const config = css({ display: "flex", flexDirection: "column", gap: "3", alignItems: "stretch" });
const presetsRow = css({ display: "flex", justifyContent: "center", gap: "4", marginTop: "4" });
const urlsList = css({ marginTop: "3", display: "flex", flexDirection: "column", gap: "3" });
const urlWrapper = css({ display: "flex", gap: "2", "& .Input": { flexGrow: 1 } });
const addButtonWrapper = css({ display: "flex", justifyContent: "flex-start" });
const compactField = css({ display: "flex", flexDirection: "column", alignItems: "flex-start" });
const saveConfig = css({ alignSelf: "flex-end", marginTop: "4" });

export const RssFeedConfigScreen = ({
  saveConfiguration,
  currentConfig,
}: WidgetConfigurationScreenProps<RssFeedConfig>) => {
  const onConfirm = () => {
    const cleanedUrls = urls.map((u) => u.url).filter((u) => !!u);
    if (cleanedUrls.length) {
      saveConfiguration({ title, feedUrls: cleanedUrls, compactView });
    }
  };

  const [title, setTitle] = useState(currentConfig ? currentConfig.title : "");
  const [urls, setUrls] = useState(
    currentConfig ? currentConfig.feedUrls.map((url) => ({ url, id: guid() })) : [{ url: "", id: guid() }],
  );
  const [compactView, setCompactView] = useState(currentConfig ? currentConfig.compactView : false);
  const { t } = useTranslation();

  const presets = [
    {
      name: t("rss-plugin.presetForDevelopers"),
      title: t("rss-plugin.presetForDevelopersTitle"),
      urls: [
        "https://blog.pragmaticengineer.com/rss/",
        "https://unicornclub.dev/feed/",
        "https://piccalil.li/feed.xml",
        "https://news.ycombinator.com/rss",
      ],
    },
    {
      name: t("rss-plugin.presetForDesigners"),
      title: t("rss-plugin.presetForDesignersTitle"),
      urls: [
        "https://www.designernews.co/?format=rss",
        "http://heydesigner.com/feed/",
        "https://webdesignernews.com/feed/",
        "https://www.marcandrew.me/rss/",
        "https://sidebar.io/feed.xml",
        "https://uxdesign.cc/feed",
      ],
    },
    {
      name: t("rss-plugin.presetInteresting"),
      title: t("rss-plugin.presetInterestingTitle"),
      urls: [
        "https://nesslabs.com/feed",
        "https://ciechanow.ski/atom.xml",
        "https://maggieappleton.com/rss.xml",
        "https://www.youtube.com/feeds/videos.xml?channel_id=UCj1VqrHhDte54oLgPG4xpuQ",
      ],
    },
  ];

  return (
    <m.div className={config}>
      <Field label={`${t("title")}:`}>
        <Input value={title} placeholder={t("title")} onChange={(e) => setTitle(e.target.value)} />
      </Field>

      <Field label={`${t("rss-plugin.feedUrls")}:`}>
        <Alert variant="info">
          <div>{t("rss-plugin.presetsTitle")}</div>
          <div className={presetsRow}>
            {presets.map(({ title, name, urls: presetUrls }) => {
              return (
                <Button
                  variant="secondary"
                  key={title}
                  onClick={() => {
                    setTitle(title);
                    setUrls((prev) => {
                      return presetUrls.map((url, ind) => ({ id: prev[ind]?.id || guid(), url }));
                    });
                  }}
                >
                  {name}
                </Button>
              );
            })}
          </div>
        </Alert>

        <div className={urlsList}>
          <AnimatePresence initial={false}>
            {urls.map(({ id, url }, ind) => {
              return (
                <m.div className={urlWrapper} layout key={id} {...listItemAnimation}>
                  <Input
                    value={url}
                    placeholder={t("rss-plugin.feedUrl")}
                    onValueChange={(newUrl) =>
                      setUrls((p) => {
                        const copy = [...p];
                        copy[ind].url = newUrl;
                        return copy;
                      })
                    }
                  />
                  <Button variant="secondary" onClick={() => setUrls((p) => p.filter((_u, i) => i !== ind))}>
                    <Icon icon={builtinIcons.close} height={22} />
                  </Button>
                </m.div>
              );
            })}
          </AnimatePresence>
        </div>
      </Field>

      <m.div layout className={addButtonWrapper}>
        <Button variant="secondary" onClick={() => setUrls((p) => [...p, { id: guid(), url: "" }])}>
          {t("add")}
        </Button>
      </m.div>

      <m.div layout className={compactField}>
        <Checkbox checked={compactView} onChange={setCompactView}>
          {t("rss-plugin.compactView")}
        </Checkbox>
      </m.div>

      <m.div layout className={saveConfig}>
        <Button onClick={onConfirm}>{t("save")}</Button>
      </m.div>
    </m.div>
  );
};
