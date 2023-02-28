import moment from 'moment-timezone';
import { AnoriPlugin, WidgetConfigurationScreenProps, WidgetDescriptor, WidgetRenderProps } from '@utils/user-data/types';
import './styles.scss';
import { Button } from '@components/Button';
import { useState } from 'react';
import { Input } from '@components/Input';
import { useMemo } from 'react';
import { Select } from '@components/Select';
import clsx from 'clsx';
import { useEffect } from 'react';
import { Combobox } from '@components/Combobox';


type WidgetConfig = {
    tz: string,
    title: string,
    timeFormat: string,
    dateFormat: string,
};

const availableTimeFormatsMap: Record<string, string> = {
    'h:mm a': '9:32 pm',
    'hh:mm a': '09:32 pm',
    'h:mm A': '9:32 PM',
    'hh:mm A': '09:32 PM',
    'H:mm': '9:32 (24-hours)',
    'HH:mm': '09:32 (24-hours)',
    'HH:mm:ss': '09:32:00'
};

const availableTimeFormats = Object.keys(availableTimeFormatsMap);

const availableDateFormatsMap: Record<string, string> = {
    'noDate': 'Without date',
    'MMM Do, Y': 'Oct 14th, 1983',
    'MMMM Do, Y': 'October 14th, 1983',
    'M/D/Y': '10/14/1983',
    'Do MMM Y': '14th Oct 1983',
    'Do MMMM Y': '14th October 1983',
    'D/M/Y': '14/10/1983',
    'Y-MM-DD': '1983-10-14',
};

const availableDateFormats = Object.keys(availableDateFormatsMap);

const ConfigScreen = ({ currentConfig, saveConfiguration }: WidgetConfigurationScreenProps<WidgetConfig>) => {
    const allTz = useMemo(() => moment.tz.names(), []);
    const [title, setTitle] = useState(currentConfig ? currentConfig.title : '');
    const [timeFormat, setTimeFormat] = useState(currentConfig ? currentConfig.timeFormat : 'HH:mm');
    const [dateFormat, setDateFormat] = useState(currentConfig ? currentConfig.dateFormat : 'noDate');
    const [tz, setTz] = useState(currentConfig ? currentConfig.tz : moment.tz.guess());

    return (<div className='DateTimeWidget-config'>
        <div>
            <label>Widget title</label>
            <Input value={title} onChange={e => setTitle(e.target.value)} />
        </div>
        <div>
            <label>Timezone</label>
            <Combobox<string>
                options={allTz}
                value={tz}
                onChange={setTz}
                placeholder='Start typing to search...'
                getOptionKey={o => o}
                getOptionLabel={o => o.replace(/_/igm, ' ')}
                shouldDisplayOption={(o, t) => o.toLowerCase().includes(t.toLowerCase())}
            />
        </div>
        <div>
            <label>Time format</label>
            <Select<string>
                options={availableTimeFormats}
                value={timeFormat}
                onChange={setTimeFormat}
                getOptionKey={o => o}
                getOptionLabel={o => availableTimeFormatsMap[o]}
            />
        </div>
        <div>
            <label>Date format</label>
            <Select<string>
                options={availableDateFormats}
                value={dateFormat}
                onChange={setDateFormat}
                getOptionKey={o => o}
                getOptionLabel={o => availableDateFormatsMap[o]}
            />
        </div>
        <Button className='save-config' onClick={() => saveConfiguration({ title, timeFormat, dateFormat, tz })}>Save</Button>
    </div>)
};

const WidgetScreen = ({ config }: WidgetRenderProps<WidgetConfig>) => {
    const [currentMoment, setCurrentMoment] = useState(moment().tz(config.tz));

    const time = useMemo(() => currentMoment.format(config.timeFormat), [currentMoment]);
    const date = useMemo(() => config.dateFormat === 'noDate' ? '' : currentMoment.format(config.dateFormat), [currentMoment]);
    const smallerTime = config.timeFormat.includes('A') || config.timeFormat.includes('a') || config.timeFormat.includes('ss');

    useEffect(() => {
        const tid = window.setInterval(() => {
            setCurrentMoment(moment().tz(config.tz));
        }, 1000);

        return () => window.clearInterval(tid);
    }, [config.tz]);

    return (<div className='DateTimeWidget'>
        <div className={clsx("time", { "smaller-time": smallerTime })}>{time}</div>
        {!!date && <div className='date'>{date}</div>}
        <div className="spacer" />
        <div className="title">{config.title}</div>
    </div>)
};

const widgetDescriptor = {
    id: 'datetime-widget',
    name: 'Date and time',
    size: {
        width: 1,
        height: 1,
    },
    configurationScreen: ConfigScreen,
    mainScreen: WidgetScreen,
    withAnimation: false,
    mock: () => (<WidgetScreen config={{
        title: 'Bratislava',
        tz: 'Europe/Bratislava',
        timeFormat: 'HH:mm',
        dateFormat: 'Do MMM Y',
    }} instanceId='mock' />),
} satisfies WidgetDescriptor<WidgetConfig>;

export const datetimePlugin = {
    id: 'datetime-plugin',
    name: 'Date and time',
    widgets: [
        widgetDescriptor,
    ],
    configurationScreen: null,
} satisfies AnoriPlugin;