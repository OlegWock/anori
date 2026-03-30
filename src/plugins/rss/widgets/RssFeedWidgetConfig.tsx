import { Alert } from "@anori/components/Alert";
import { Button } from "@anori/components/Button";
import { Checkbox } from "@anori/components/Checkbox";
import { Input } from "@anori/components/Input";
import { listItemAnimation } from "@anori/components/animations";
import { Icon } from "@anori/components/icon/Icon";
import { builtinIcons } from "@anori/components/icon/builtin-icons";
import { guid } from "@anori/utils/misc";
import type { WidgetConfigurationScreenProps } from "@anori/utils/plugins/types";
import { AnimatePresence, m } from "framer-motion";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { RssFeedConfig } from "../types";
import "./RssFeedWidgetConfig.scss";

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
    <m.div className="RssFeed-config">
      <div className="field">
        <label>{t("title")}:</label>
        <Input value={title} placeholder={t("title")} onChange={(e) => setTitle(e.target.value)} />
      </div>

      <div className="field">
        <label>{t("rss-plugin.feedUrls")}:</label>

        <Alert level="info">
          <div>{t("rss-plugin.presetsTitle")}</div>
          <div className="presets">
            {presets.map(({ title, name, urls }) => {
              return (
                <Button
                  className="preset"
                  key={title}
                  onClick={() => {
                    setTitle(title);
                    setUrls((prev) => {
                      return urls.map((url, ind) => ({ id: prev[ind]?.id || guid(), url }));
                    });
                  }}
                >
                  {name}
                </Button>
              );
            })}
          </div>
        </Alert>

        <div className="urls">
          <AnimatePresence initial={false}>
            {urls.map(({ id, url }, ind) => {
              return (
                <m.div className="url-wrapper" layout key={id} {...listItemAnimation}>
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
                  <Button onClick={() => setUrls((p) => p.filter((_u, i) => i !== ind))}>
                    <Icon icon={builtinIcons.close} height={22} />
                  </Button>
                </m.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>

      <m.div layout className="button-wrapper">
        <Button className="add-button" onClick={() => setUrls((p) => [...p, { id: guid(), url: "" }])}>
          {t("add")}
        </Button>
      </m.div>

      <m.div layout>
        <Checkbox checked={compactView} onChange={setCompactView}>
          {t("rss-plugin.compactView")}
        </Checkbox>
      </m.div>

      <m.div layout className="button-wrapper">
        <Button className="save-config" onClick={onConfirm}>
          {t("save")}
        </Button>
      </m.div>
    </m.div>
  );
};
