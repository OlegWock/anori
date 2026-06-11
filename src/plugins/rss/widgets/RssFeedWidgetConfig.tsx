import { listItemAnimation } from "@anori/components/animations";
import { Button } from "@anori/design-system/components/Button/Button";
import { Checkbox } from "@anori/design-system/components/Checkbox/Checkbox";
import { Field } from "@anori/design-system/components/Field/Field";
import { builtinIcons } from "@anori/design-system/components/Icon/builtin-icons";
import { Icon } from "@anori/design-system/components/Icon/Icon";
import { Input } from "@anori/design-system/components/Input/Input";
import { TextButton } from "@anori/design-system/components/TextButton/TextButton";
import { guid } from "@anori/utils/misc";
import type { WidgetConfigScreenProps } from "@anori/utils/plugins/define";
import { AnimatePresence, m } from "motion/react";
import { useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { css } from "styled-system/css";
import type { RssFeedConfig } from "../types";

const config = css({ display: "flex", flexDirection: "column", gap: "3", alignItems: "stretch" });
const urlsList = css({ display: "flex", flexDirection: "column", gap: "3" });
const urlWrapper = css({ display: "flex", gap: "2", "& .Input": { flexGrow: 1 } });
const addButtonWrapper = css({ display: "flex", justifyContent: "flex-start" });
const compactField = css({ display: "flex", flexDirection: "column", alignItems: "flex-start" });
const saveConfig = css({ alignSelf: "flex-end", marginTop: "4" });

export const RssFeedConfigScreen = ({ saveConfiguration, currentConfig }: WidgetConfigScreenProps<RssFeedConfig>) => {
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
      title: t("rss-plugin.presetForDevelopersTitle"),
      urls: [
        "https://blog.pragmaticengineer.com/rss/",
        "https://unicornclub.dev/feed/",
        "https://piccalil.li/feed.xml",
        "https://news.ycombinator.com/rss",
      ],
    },
    {
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
      title: t("rss-plugin.presetInterestingTitle"),
      urls: [
        "https://nesslabs.com/feed",
        "https://ciechanow.ski/atom.xml",
        "https://maggieappleton.com/rss.xml",
        "https://www.youtube.com/feeds/videos.xml?channel_id=UCj1VqrHhDte54oLgPG4xpuQ",
      ],
    },
  ];

  const applyPreset = (preset: { title: string; urls: string[] }) => {
    setTitle(preset.title);
    setUrls((prev) => preset.urls.map((url, ind) => ({ id: prev[ind]?.id || guid(), url })));
  };

  return (
    <m.div className={config}>
      <Field label={`${t("title")}:`}>
        <Input value={title} placeholder={t("title")} onChange={(e) => setTitle(e.target.value)} />
      </Field>

      <Field
        label={`${t("rss-plugin.feedUrls")}:`}
        description={
          <Trans t={t} i18nKey="rss-plugin.presetsText">
            <TextButton onClick={() => applyPreset(presets[0])} />
            <TextButton onClick={() => applyPreset(presets[1])} />
            <TextButton onClick={() => applyPreset(presets[2])} />
          </Trans>
        }
      >
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
          {t("rss-plugin.addFeed")}
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
