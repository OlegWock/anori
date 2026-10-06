import { builtinIcons } from "@anori/design-system/components/Icon/builtin-icons";
import { IconButton } from "@anori/design-system/components/IconButton/IconButton";
import { Input } from "@anori/design-system/components/Input/Input";
import type { CalendarAdapter } from "@anori/plugins/calendar/calendar-adapter";
import { useParentFolder } from "@anori/utils/FolderContentContext";
import { useNow } from "@anori/utils/hooks";
import type { WidgetRenderProps } from "@anori/utils/plugins/define";
import { type KeyboardEvent, memo, useState } from "react";
import { useTranslation } from "react-i18next";
import { css, cva, cx } from "styled-system/css";
import { useCalendarAdapter } from "../hooks";
import { parseLocalDateKey, startOfDay, startOfWeek, toLocalDateKey } from "../periods";
import { useFocusStore } from "../storage";
import type { FocusConfig } from "../types";

const root = css({
  position: "relative",
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  alignItems: "center",
  textAlign: "center",
  flexGrow: 1,
  minHeight: 0,
  minWidth: 0,
  gap: "2",
});
const promptLabel = css({ fontSize: "sm", lineHeight: "tight", flexShrink: 0, color: "text.subtle" });
const focusText = cva({
  base: {
    lineClamp: 3,
    overflowWrap: "anywhere",
    fontSize: "calc(1.15rem + var(--widget-box-percent, 0.5) * 0.5rem)",
    fontWeight: "light",
    lineHeight: "tight",
    textAlign: "center",
    background: "none",
    border: "none",
    padding: 0,
    color: "inherit",
    fontFamily: "inherit",
    cursor: "text",
    transition: "opacity 0.15s ease",
  },
  variants: { done: { true: { textDecoration: "line-through", opacity: 0.55 } } },
});
const focusInput = css({
  fontSize: "calc(1.15rem + var(--widget-box-percent, 0.5) * 0.5rem)!",
  fontWeight: "light",
  height: "auto",
  width: "100%",
  textAlign: "center",
  paddingInline: "2!",
});
const actions = css({
  position: "absolute",
  top: 0,
  insetInlineEnd: 0,
  zIndex: "docked",
  display: "flex",
  gap: "1",
  padding: "1",
  borderRadius: "md",
  bg: "surface",
  opacity: 0,
  pointerEvents: "none",
  transition: "opacity 0.15s ease",
  ".WidgetCard:hover &": { opacity: 1, pointerEvents: "auto" },
  "&:has(:focus-visible)": { opacity: 1, pointerEvents: "auto" },
});

const periodKeyFor = (config: FocusConfig, calendar: CalendarAdapter, date: Date): string => {
  switch (config.cadence) {
    case "daily":
      return toLocalDateKey(startOfDay(date));
    case "weekly":
      return toLocalDateKey(startOfWeek(date, config.firstDay));
    case "monthly":
      return toLocalDateKey(calendar.startOfMonth(startOfDay(date)));
    case "manual":
      return "manual";
  }
};

export type FocusPreview = { text: string; done?: boolean };

export const FocusWidget = memo(function FocusWidget({
  config,
  preview,
}: WidgetRenderProps<FocusConfig> & { preview?: FocusPreview }) {
  const { t } = useTranslation();
  const { isEditing: isEditingFolder } = useParentFolder();
  const now = useNow(60_000);
  const calendar = useCalendarAdapter(config.calendar);
  const store = useFocusStore();
  const [storedText] = store.useValue("text", "");
  const [setOn] = store.useValue("setOn", "");
  const [done, setDone] = store.useValue("done", false);
  const [draft, setDraft] = useState<string | null>(null);

  const setOnDate = parseLocalDateKey(setOn);
  const isCurrent =
    setOnDate !== null && periodKeyFor(config, calendar, setOnDate) === periodKeyFor(config, calendar, now);
  const text = preview ? preview.text : isCurrent ? storedText : "";
  const isDone = preview ? !!preview.done : isCurrent && done;
  const editing = draft !== null || text === "";
  const prompt = config.prompt;
  const showActions = !editing && !isEditingFolder && !preview;

  const commit = () => {
    if (draft === null) return;
    const next = draft.trim();
    setDraft(null);
    if (next === text) return;
    void store.setMany({ text: next, setOn: toLocalDateKey(new Date()), done: false });
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" && !event.nativeEvent.isComposing) commit();
    if (event.key === "Escape") setDraft(null);
  };

  return (
    <div className={root}>
      <div className={promptLabel}>{prompt}</div>
      {editing ? (
        <Input
          variant="ghost"
          className={focusInput}
          value={draft ?? ""}
          onValueChange={setDraft}
          onKeyDown={onKeyDown}
          onFocus={(event) => event.currentTarget.select()}
          onBlur={commit}
          placeholder={t("motivation-plugin.focusPlaceholder")}
          aria-label={prompt}
          autoFocus={draft !== null}
        />
      ) : (
        <button type="button" className={cx(focusText({ done: isDone }))} onClick={() => setDraft(text)}>
          {text}
        </button>
      )}
      {showActions && (
        <div className={actions}>
          <IconButton
            size="compact"
            variant="ghost"
            icon={builtinIcons.check}
            label={t(isDone ? "motivation-plugin.markNotDone" : "motivation-plugin.markDone")}
            onClick={() => setDone(!isDone)}
          />
          <IconButton
            size="compact"
            variant="ghost"
            icon={builtinIcons.pencil}
            label={t("motivation-plugin.editFocus")}
            onClick={() => setDraft(text)}
          />
        </div>
      )}
    </div>
  );
});
