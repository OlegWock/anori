import { Button } from "@components/Button";
import { AnoriPlugin, WidgetConfigurationScreenProps, WidgetRenderProps } from "@utils/user-data/types";
import { useState } from "react";
import './styles.scss';
import { Icon } from "@components/Icon";
import { useMemo } from "react";
import clsx from "clsx";
import moment from "moment-timezone";
import { useEffect } from "react";
import { ReactNode } from "react";
import { AnimatePresence, m } from "framer-motion";
import { usePrevious } from "@utils/hooks";
import { Select } from "@components/Select";
import { useTranslation } from "react-i18next";
import { translate } from "@translations/index";
import { capitalize } from "@utils/strings";

type CalendarWidgetConfigType = {
    // 0 is monday, 6 is sunday
    // This is marked as optional because first version of widget didn't had this 
    // settings, thus it's not guaranteed to have this set
    firstDay?: number,
};

const getWeekdays = (short = false) => {
    const days = short ? moment.weekdaysMin() : moment.weekdays();
    return [...days.slice(1), ...days.slice(0, 1)].map(s => capitalize(s).replace('.', ''));
}

const ConfigScreen = ({ currentConfig, saveConfiguration }: WidgetConfigurationScreenProps<CalendarWidgetConfigType>) => {
    const { t, i18n } = useTranslation();
    const weekdays = useMemo(getWeekdays, [i18n.language]);

    const [firstDay, setFirstDay] = useState<number>(currentConfig?.firstDay ?? 0);

    return (<div className='CalendarWidget-config'>
        <div>
            <label>{t('calendar-plugin.firstDayOfWeek')}:</label>
            <Select<number>
                options={[0, 1, 2, 3, 4, 5, 6]}
                value={firstDay}
                onChange={setFirstDay}
                getOptionKey={o => o.toString()}
                getOptionLabel={o => weekdays[o]}
            />
        </div>

        <Button className='save-config' onClick={() => saveConfiguration({ firstDay })}>{t('save')}</Button>
    </div>)
};

const MainScreen = ({ config, instanceId }: WidgetRenderProps<CalendarWidgetConfigType>) => {
    const { t, i18n } = useTranslation();

    console.log('Render calendar', i18n.language);

    const [today, setToday] = useState(() => moment());
    const [offsetMonths, setOffsetMonths] = useState(0);
    const prevOffset = usePrevious(offsetMonths, offsetMonths);
    const direction = prevOffset > offsetMonths ? "right" : "left";
    const currentMonth = useMemo(() => today.clone().add(offsetMonths, 'months'), [today, offsetMonths]);

    const firstDayShift = config.firstDay ?? 0;

    const monthName = useMemo(() => capitalize(currentMonth.format('MMMM')), [currentMonth]);

    useEffect(() => {
        setToday(moment());
    }, [i18n.language]);

    const variants = {
        exit: (direction: 'left' | 'right') => {
            return {
                'left': {
                    translateX: '-100%',
                },
                'right': {
                    translateX: '100%'
                }
            }[direction];
        },
        enter: (direction: 'left' | 'right') => {
            return {
                'left': {
                    translateX: '100%',
                },
                'right': {
                    translateX: '-100%'
                }
            }[direction];
        }
    };


    const rows: ReactNode[] = useMemo(() => {
        console.log('Render rows', { direction });
        const res: ReactNode[] = [];
        const startOfMonth = today.clone().add(offsetMonths, 'months').startOf('month');
        const monthNumber = startOfMonth.month();
        const startOfFirstWeek = startOfMonth.clone().day((1 + firstDayShift) % 7);
        if (startOfFirstWeek.isAfter(startOfMonth)) {
            startOfFirstWeek.subtract(1, 'week');
        }

        const currentDate = startOfFirstWeek.clone();
        for (let week = 0; currentDate.isSame(currentMonth, 'month') || week === 0; week++) {
            const row: ReactNode[] = [];
            for (let weekday = 0; weekday < 7; weekday++) {
                const inCurrentMonth = currentDate.isSame(currentMonth, 'month');
                const isToday = currentDate.isSame(today, 'day');
                row.push(<div className={clsx("calendar-cell", { 'current-month': inCurrentMonth, 'today': isToday })} key={`${currentDate.month()}_${currentDate.date()}`}>{currentDate.date()}</div>);
                currentDate.add(1, 'day');
            }
            res.push(<m.div
                className="calendar-row"
                key={`row-${monthNumber}-${week}`}
            >
                {row}
            </m.div>);
        }

        return res;
    }, [today, offsetMonths, i18n.language, firstDayShift]);
    const currentKey = useMemo(() => currentMonth.month() + '_' + currentMonth.year(), [currentMonth]);

    useEffect(() => {
        const tid = setInterval(() => setToday(moment()), 1000 * 60);
        return () => clearInterval(tid);
    });

    const headerDays = useMemo(() => {
        const weekdays = getWeekdays();
        const long = [...weekdays.slice(firstDayShift), ...weekdays.slice(0, firstDayShift)];
        const weekdaysShort = getWeekdays(true);
        const short = [...weekdaysShort.slice(firstDayShift), ...weekdaysShort.slice(0, firstDayShift)];
        return long.map((l, i) => [l, short[i]] as const);
    }, [i18n.language, firstDayShift]);

    return (<div className="CalendarWidget">
        <h3 className="header">
            <Button withoutBorder onClick={() => setOffsetMonths(p => p - 1)}>
                <Icon icon="ion:chevron-back" />
            </Button>
            <Button withoutBorder onClick={() => setOffsetMonths(0)} className="month-name">{monthName}</Button>
            <Button withoutBorder onClick={() => setOffsetMonths(p => p + 1)}>
                <Icon icon="ion:chevron-forward" />
            </Button>
        </h3>
        <m.div className="calendar-grid">
            <div className="calendar-row weekdays" key='weekdays'>
                {headerDays.map(([weekday, weekdayShort]) => {
                    return (<div className="calendar-cell" key={weekday}>{weekdayShort}</div>);
                })}
            </div>
            <AnimatePresence mode="wait" custom={direction} initial={false}>
                <m.div
                    className="calendar-days"
                    custom={direction}
                    transition={{ duration: 0.12 }}
                    variants={variants}
                    initial={"enter"}
                    animate={{ translateX: 0 }}
                    exit={"exit"}
                    key={currentKey}
                >
                    {rows}
                </m.div>
            </AnimatePresence>
        </m.div>

    </div>);
};


const widgetDescriptor = {
    id: 'calendar-m',
    get name() {
        return translate('calendar-plugin.widgetName')
    },
    configurationScreen: ConfigScreen,
    withAnimation: false,
    mainScreen: MainScreen,
    mock: () => {
        return (<MainScreen instanceId="mock" config={{}} />)
    },
    appearance: {
        resizable: false,
        size: {
            width: 2,
            height: 2,
        }
    }
} as const;

export const calendarPlugin = {
    id: 'calendar-plugin',
    get name() {
        return translate('calendar-plugin.name');
    },
    widgets: [
        widgetDescriptor,
    ],
    configurationScreen: null,
} satisfies AnoriPlugin;