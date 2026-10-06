import { Field } from "@anori/design-system/components/Field/Field";
import { Input } from "@anori/design-system/components/Input/Input";
import { Select } from "@anori/design-system/components/Select/Select";
import {
  getCalendarLabel,
  SUPPORTED_CALENDARS,
  type SupportedCalendar,
} from "@anori/plugins/calendar/calendar-adapter";
import { getWeekdays } from "@anori/plugins/calendar/types";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { css } from "styled-system/css";
import { toLocalDateKey } from "../periods";

export const configForm = css({ display: "flex", flexDirection: "column", gap: "3", alignItems: "stretch" });
export const saveButton = css({ alignSelf: "center", marginTop: "4" });
export const fieldRow = css({ display: "flex", gap: "3", "& > *": { flex: 1 } });

export const useWeekdayNames = (short = false) => {
  const { i18n } = useTranslation();
  // biome-ignore lint/correctness/useExhaustiveDependencies: weekday names follow the active locale
  return useMemo(() => getWeekdays(short), [short, i18n.language]);
};

export const FirstDayField = ({ value, onChange }: { value: number; onChange: (value: number) => void }) => {
  const { t } = useTranslation();
  const weekdays = useWeekdayNames();
  return (
    <Field label={t("calendarSettings.firstDayOfWeek")}>
      <Select<number>
        options={[0, 1, 2, 3, 4, 5, 6]}
        value={value}
        onChange={onChange}
        getOptionKey={(o) => o.toString()}
        getOptionLabel={(o) => weekdays[o]}
      />
    </Field>
  );
};

export const CalendarField = ({
  value,
  onChange,
}: {
  value: SupportedCalendar;
  onChange: (value: SupportedCalendar) => void;
}) => {
  const { t, i18n } = useTranslation();
  return (
    <Field label={t("calendarSettings.calendarType")}>
      <Select<SupportedCalendar>
        options={[...SUPPORTED_CALENDARS]}
        value={value}
        onChange={onChange}
        getOptionKey={(o) => o}
        getOptionLabel={(o) => getCalendarLabel(o, i18n.language)}
      />
    </Field>
  );
};

export const DateOfBirthField = ({ value, onChange }: { value: string; onChange: (value: string) => void }) => {
  const { t } = useTranslation();
  return (
    <Field label={t("motivation-plugin.dateOfBirth")}>
      <Input type="date" value={value} onValueChange={onChange} max={toLocalDateKey(new Date())} />
    </Field>
  );
};
