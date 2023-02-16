import { Button } from "@components/Button";
import { Input } from "@components/Input";
import { AnoriPlugin, WidgetConfigurationScreenProps, OnCommandInputCallback, WidgetRenderProps } from "@utils/user-data/types";
import { useState } from "react";
import './styles.scss';
import { Popover } from "@components/Popover";
import { IconPicker } from "@components/IconPicker";
import { Icon } from "@components/Icon";
import { useMemo } from "react";
import clsx from "clsx";
import { getAllWidgetsByPlugin } from "@utils/plugin";
import moment, { duration } from "moment-timezone";
import { useEffect } from "react";
import { ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { usePrevious } from "@utils/hooks";
import { useParentFolder } from "@utils/FolderContentContext";

type CalendarWidgetConfigType = {

};



const MainScreen = ({ config, instanceId }: WidgetRenderProps<CalendarWidgetConfigType>) => {
    const { isEditing } = useParentFolder();
    const [today, setToday] = useState(() => moment());
    const [offsetMonths, setOffsetMonths] = useState(0);
    const prevOffset = usePrevious(offsetMonths, offsetMonths);
    const direction = prevOffset > offsetMonths ? "right" : "left";
    console.log('Render calendar', { offsetMonths, prevOffset, direction });
    const currentMonth = useMemo(() => today.clone().add(offsetMonths, 'months'), [today, offsetMonths]);

    const monthName = useMemo(() => currentMonth.format('MMMM'), [currentMonth]);

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
        const startOfFirstWeek = startOfMonth.clone().weekday(1);

        let currentDate = startOfFirstWeek.clone();
        for (let week = 0; currentDate.isSame(currentMonth, 'month') || week === 0; week++) {
            const row: ReactNode[] = [];
            for (let weekday = 0; weekday < 7; weekday++) {
                const inCurrentMonth = currentDate.isSame(currentMonth, 'month');
                const isToday = currentDate.isSame(today, 'day');
                row.push(<div className={clsx("calendar-cell", { 'current-month': inCurrentMonth, 'today': isToday })} key={`${currentDate.month()}_${currentDate.date()}`}>{currentDate.date()}</div>);
                currentDate.add(1, 'day');
            }
            res.push(<motion.div
                custom={direction}
                transition={{ duration: 0.12 }}
                variants={variants}
                initial={"enter"}
                animate={{ translateX: 0 }}
                exit={"exit"}
                className="calendar-row"
                key={`row-${monthNumber}-${week}`}
            >
                {row}
            </motion.div>);
        }

        return res;
    }, [today, offsetMonths]);

    useEffect(() => {
        const tid = setInterval(() => setToday(moment()), 1000 * 60);
        return () => clearInterval(tid);
    });

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
        <motion.div className="calendar-grid">
            <div className="calendar-row weekdays" key='weekdays'>
                <div className="calendar-cell">M</div>
                <div className="calendar-cell">T</div>
                <div className="calendar-cell">W</div>
                <div className="calendar-cell">T</div>
                <div className="calendar-cell">F</div>
                <div className="calendar-cell">S</div>
                <div className="calendar-cell">S</div>
            </div>
            <AnimatePresence mode="wait" custom={direction} initial={false}>
                {rows}
            </AnimatePresence>
        </motion.div>

    </div>);
};


const widgetDescriptor = {
    id: 'calendar-m',
    name: 'Calendar',
    configurationScreen: null,
    withAnimation: false,
    mainScreen: MainScreen,
    mock: () => {
        return (<MainScreen instanceId="mock" config={{}} />)
    },
    size: {
        width: 2,
        height: 2,
    }
} as const;

export const calendarPlugin = {
    id: 'calendar-plugin',
    name: 'Calendar',
    widgets: [
        widgetDescriptor,
    ],
    configurationScreen: null,
} satisfies AnoriPlugin;