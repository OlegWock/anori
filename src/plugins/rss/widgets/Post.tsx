import { ClampTextToFit } from "@anori/components/ClampTextToFit";
import { RelativeTime } from "@anori/components/RelativeTime";
import { Icon } from "@anori/components/icon/Icon";
import { builtinIcons } from "@anori/components/icon/builtin-icons";
import { useWidgetInteractionTracker } from "@anori/utils/analytics";
import { useSizeSettings } from "@anori/utils/compact";
import clsx from "clsx";
import moment from "moment-timezone";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { RssPost } from "../utils";
import "./Post.scss";

const parser = (typeof DOMParser === "undefined" ? null : new DOMParser()) as DOMParser;

const decodeHtmlEntities = (text: string) => {
  const plaintext = parser.parseFromString(text, "text/html").documentElement.textContent || "";
  if (plaintext.length > 150) {
    return `${plaintext.slice(0, 150)}…`;
  }
  return plaintext;
};

export const Post = ({
  post,
  clampTitle = false,
  compact = false,
}: { post: RssPost; clampTitle?: boolean; compact?: boolean }) => {
  const { rem } = useSizeSettings();
  const { i18n } = useTranslation();
  const trackInteraction = useWidgetInteractionTracker();
  // TODO: probably should refactor this so dependencies are explicit?
  // biome-ignore lint/correctness/useExhaustiveDependencies: we use i18n as reactive proxy for current locale which affect some of functions outside of components
  const postMoment = useMemo(() => moment(post.timestamp), [post.timestamp, i18n.language]);
  const feedTitle = useMemo(() => decodeHtmlEntities(post.feed.title), [post.feed.title]);
  const title = useMemo(() => decodeHtmlEntities(post.title), [post.title]);
  const subtitle = useMemo(() => decodeHtmlEntities(post.description), [post.description]);

  return (
    <a className={clsx("Post", compact && "compact")} href={post.url} onClick={() => trackInteraction("Open post")}>
      {clampTitle && <ClampTextToFit withTooltip text={title} as="h3" className="title" />}
      {!clampTitle && (
        <>
          <h3 className="title">
            {title}
            {compact && (
              <span className="compact-post-date">
                &nbsp;&middot;&nbsp;
                <RelativeTime m={postMoment} />
              </span>
            )}
          </h3>
          {!compact && <div className="description">{subtitle}</div>}
        </>
      )}
      {!compact && (
        <div className="details">
          <div className="feed-name">
            <Icon icon={builtinIcons.rssIcon} height={rem(1)} /> <span>{feedTitle}</span>
          </div>
          <div className="post-date">
            <Icon icon={builtinIcons.time} height={rem(1)} />{" "}
            <span>
              <RelativeTime m={postMoment} />
            </span>
          </div>
        </div>
      )}
    </a>
  );
};
