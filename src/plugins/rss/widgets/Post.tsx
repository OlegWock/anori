import { RelativeTime } from "@anori/components/RelativeTime";
import { ClampTextToFit } from "@anori/design-system/components/ClampTextToFit/ClampTextToFit";
import { Heading } from "@anori/design-system/components/Heading/Heading";
import { builtinIcons } from "@anori/design-system/components/Icon/builtin-icons";
import { Icon } from "@anori/design-system/components/Icon/Icon";
import { useWidgetInteractionTracker } from "@anori/utils/analytics";
import { useSizeSettings } from "@anori/utils/compact";
import moment from "moment-timezone";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { css, cx } from "styled-system/css";
import type { RssPost } from "../utils";

const postRoot = css({ textDecoration: "none", display: "flex", flexDirection: "column", flex: 1 });
const postTitle = css({ flex: 1, lineHeight: "1.25", overflow: "hidden" });
const compactPostDate = css({ color: "text.subtle", fontSize: "sm", fontWeight: 200 });
const postDescription = css({ marginTop: "1", color: "text.placeholder" });
const postDetails = css({
  display: "flex",
  justifyContent: "flex-start",
  alignItems: "flex-start",
  flexWrap: "wrap",
  columnGap: "3",
  rowGap: "2",
  marginTop: "2",
  "& svg": { color: "icon.subtle" },
});
const detailItem = css({ display: "flex", alignItems: "center", gap: "1-5", lineHeight: "none", color: "text.subtle" });

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
  className,
}: {
  post: RssPost;
  clampTitle?: boolean;
  compact?: boolean;
  className?: string;
}) => {
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
    <a className={cx(postRoot, className)} href={post.url} onClick={() => trackInteraction("Open post")}>
      {clampTitle && (
        <ClampTextToFit withTooltip text={title} as={Heading} level={3} singleLine={false} className={postTitle} />
      )}
      {!clampTitle && (
        <>
          <Heading level={3} singleLine={false} className={postTitle}>
            {title}
            {compact && (
              <span className={compactPostDate}>
                &nbsp;&middot;&nbsp;
                <RelativeTime m={postMoment} />
              </span>
            )}
          </Heading>
          {!compact && <div className={postDescription}>{subtitle}</div>}
        </>
      )}
      {!compact && (
        <div className={postDetails}>
          <div className={detailItem}>
            <Icon icon={builtinIcons.rssIcon} height={rem(1)} /> <span>{feedTitle}</span>
          </div>
          <div className={detailItem}>
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
