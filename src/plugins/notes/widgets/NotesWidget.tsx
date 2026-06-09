import { ReactMarkdown } from "@anori/components/lazy-components";
import { Input, Textarea } from "@anori/design-system/components/Input/Input";
import { Link } from "@anori/design-system/components/Link/Link";
import { ScrollArea } from "@anori/design-system/components/ScrollArea/ScrollArea";
import { useWidgetInteractionTracker } from "@anori/utils/analytics";
import { useRunAfterNextRender } from "@anori/utils/hooks";
import type { WidgetRenderProps } from "@anori/utils/plugins/types";
import type { EmptyObject } from "@anori/utils/types";
import { type ComponentProps, type KeyboardEventHandler, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { Options } from "react-markdown";
import { css, cx } from "styled-system/css";
import { useNotesStore } from "../storage";
import { sequentialNewlinesPlugin } from "../utils";

const notesWidget = css({
  display: "flex",
  flexDirection: "column",
  alignItems: "stretch",
  textDecoration: "none",
  flexGrow: 1,
  overflow: "hidden",
});
// Shared box for the title + body inputs: a tight, full-width field with a darker scrollbar (the editor).
const noteInput = css({
  margin: "0-5",
  minWidth: 0,
  paddingBlock: "1",
  paddingInline: "2!",
  height: "auto",
});
const noteTitle = css({ fontSize: "xl!" });
const noteBodyEditor = css({
  resize: "none",
  flexGrow: 1,
  fontFamily: "inherit",
  fontSize: "inherit",
  lineHeight: "inherit",
  letterSpacing: "inherit",
  color: "inherit",
});
const noteBodyRendered = css({
  flexGrow: 1,
  flexShrink: 1,
  overflow: "hidden",
  fontFamily: "inherit",
  fontSize: "inherit",
  lineHeight: "inherit",
  marginBlock: "0-5",
  marginInline: "3",
  cursor: "text",
  textAlign: "start",
  display: "flex",
  flexDirection: "column",
  alignItems: "stretch",
  "& .ScrollAreaRoot": { maxHeight: "100%", borderRadius: 0 },
});
// Styles the raw HTML react-markdown emits, so these element selectors are inherently nested.
const noteBodyContent = css({
  "& p:not(:first-child)": { marginTop: "1" },
  "& ul, & ol": { listStylePosition: "inside" },
  "& blockquote": {
    paddingLeft: "3",
    borderLeftWidth: "0.15rem",
    borderLeftStyle: "solid",
    borderLeftColor: "text.placeholder",
  },
  "& hr": {
    width: "100%",
    borderBottomWidth: "1px",
    borderBottomStyle: "solid",
    borderBottomColor: "frosted.strong",
    marginBlock: "3",
  },
  "& > * ul, & > * ol": { marginLeft: "6" },
  "& li > p": { display: "contents" },
  "& code": { background: "card", paddingBlock: "0-5", paddingInline: "2", borderRadius: "xs" },
  "& pre": {
    padding: "2",
    background: "card",
    borderRadius: "md",
    "& code": { background: "inherit", padding: 0, borderRadius: 0 },
  },
  "& table, & th, & td": { borderWidth: "1px", borderStyle: "solid", borderColor: "frosted.strong" },
  "& table": { borderCollapse: "collapse" },
  "& td": { paddingBlock: "1", paddingInline: "3" },
  "& img": { maxWidth: "100%" },
});
const notesBodyPlaceholder = css({ opacity: 0.5 });

export const Mock = () => {
  const { t } = useTranslation();
  return (
    <div className={notesWidget}>
      <Input
        variant="ghost"
        value={t("notes-plugin.exampleTitle")}
        className={cx(noteInput, noteTitle)}
        spellCheck={false}
      />
      <div className={noteBodyRendered}>{t("notes-plugin.exampleText")}</div>
    </div>
  );
};

const LinkWithoutPropagation = (props: ComponentProps<typeof Link>) => {
  return <Link onClick={(e) => e.stopPropagation()} onFocus={(e) => e.stopPropagation()} {...props} />;
};

export const MainScreen = (_props: WidgetRenderProps<EmptyObject>) => {
  const switchEditing = (newIsEditing: boolean) => {
    if (newIsEditing) {
      runAfterNextRender(() => {
        if (bodyEditorRef.current) bodyEditorRef.current.focus();
      });
    }
    setIsEditing(newIsEditing);
  };

  const handleKeyDown: KeyboardEventHandler<HTMLTextAreaElement> = (event) => {
    if (event.key !== "Tab") return;
    event.preventDefault();
    const textarea = event.currentTarget;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const value = `${textarea.value.substring(0, start)}\t${textarea.value.substring(end)}`;
    textarea.selectionStart = textarea.selectionEnd = start + 1;
    setBody(value);
  };

  const store = useNotesStore();
  const [title, setTitle] = store.useValue("title", "");
  const [body, setBody] = store.useValue("body", "");
  const [isEditing, setIsEditing] = useState(false);
  const [titleFocused, setTitleFocused] = useState(false);
  const bodyEditorRef = useRef<HTMLTextAreaElement>(null);
  const { t } = useTranslation();
  const runAfterNextRender = useRunAfterNextRender();
  const [remarkPlugins, setRemarkPlugins] = useState<NonNullable<Options["remarkPlugins"]>>([sequentialNewlinesPlugin]);
  const trackInteraction = useWidgetInteractionTracker();

  useEffect(() => {
    import("remark-gfm").then(({ default: remarkGfm }) => setRemarkPlugins((p) => [...p, remarkGfm]));
    import("remark-breaks").then(({ default: remarkBreaks }) => setRemarkPlugins((p) => [...p, remarkBreaks]));
  }, []);

  return (
    <div className={notesWidget}>
      <Input
        variant="ghost"
        value={title}
        onValueChange={setTitle}
        className={cx(noteInput, noteTitle)}
        placeholder={t("notes-plugin.noteTitle")}
        spellCheck={titleFocused}
        onFocus={() => {
          trackInteraction("Initiate editing");
          setTitleFocused(true);
        }}
        onBlur={() => setTitleFocused(false)}
      />
      {isEditing && (
        <Textarea
          variant="ghost"
          autosize={false}
          value={body}
          onValueChange={setBody}
          className={cx(noteInput, noteBodyEditor)}
          placeholder={t("notes-plugin.noteText")}
          onBlur={() => switchEditing(false)}
          onKeyDown={handleKeyDown}
          ref={bodyEditorRef}
        />
      )}
      {!isEditing && (
        <button
          type="button"
          className={noteBodyRendered}
          onFocus={() => {
            trackInteraction("Initiate editing");
            switchEditing(true);
          }}
          onClick={() => {
            trackInteraction("Initiate editing");
            switchEditing(true);
          }}
        >
          <ScrollArea type="hover">
            {!!body && (
              <div className={noteBodyContent}>
                <ReactMarkdown
                  components={{ a: LinkWithoutPropagation }}
                  remarkPlugins={remarkPlugins}
                  children={body}
                />
              </div>
            )}
          </ScrollArea>
          {!body && <span className={notesBodyPlaceholder}>{t("notes-plugin.noteText")}</span>}
        </button>
      )}
    </div>
  );
};
