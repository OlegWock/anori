
import { AnoriPlugin, OnCommandInputCallback, WidgetConfigurationScreenProps, WidgetDescriptor, WidgetRenderProps } from '@utils/user-data/types';
import './styles.scss';
import { Button } from '@components/Button';
import browser from 'webextension-polyfill';
import { useMemo, useState } from 'react';
import { Input } from '@components/Input';
import { Select } from '@components/Select';
import { Icon } from '@components/Icon';
import { Tooltip } from '@components/Tooltip';
import { RequirePermissions } from '@components/RequirePermissions';
import { useEffect } from 'react';
import moment from 'moment-timezone';
import { motion, useAnimationControls } from 'framer-motion';
import { wait } from '@utils/misc';
import { ScrollArea } from '@components/ScrollArea';

const Session = ({ session, isMock }: { session: browser.Sessions.Session, isMock: boolean }) => {
    const restore = async () => {
        controls.start('swipe', { duration: 0.1 });
        await wait(100);
        if (isMock) {
            controls.set('reset');
        } else {
            await browser.sessions.restore(session.tab ? session.tab.sessionId : session.window?.sessionId);
            window.close();
        }
    };
    const controls = useAnimationControls();
    const favIcon = session.tab ? session.tab.favIconUrl : '';
    const lastModified = useMemo(() => moment.unix(session.lastModified).fromNow(true), [session.lastModified]);

    return (<motion.div
        className='Session'
        animate={controls}
        onClick={restore}
        variants={{
            'swipe': {
                translateX: '65%',
                opacity: 0,
            },
            'reset': {
                translateX: '0',
                opacity: 1,
            }
        }}
    >
        {!!favIcon && <img className="fav-icon" src={favIcon} />}
        {!favIcon && <Icon icon={session.tab ? 'ic:baseline-tab' : 'ic:outline-window'} />}
        <div className="title">
            {session.tab ? (session.tab.title || 'Tab') : (session.window?.title || 'Window')}
        </div>
        <div className="last-modified">
            {lastModified}
        </div>

    </motion.div>)
};

const WidgetScreen = ({ config, instanceId }: WidgetRenderProps<{}>) => {
    const [sessions, setSessions] = useState<browser.Sessions.Session[]>([]);

    useEffect(() => {
        const load = async () => {
            const results = await browser.sessions.getRecentlyClosed();
            setSessions(results);
        };
        load();

        const tid = setInterval(() => load(), 1000 * 30);
        browser.sessions.onChanged.addListener(load);
        return () => {
            browser.sessions.onChanged.removeListener(load);
            clearInterval(tid);
        }
    }, []);

    return (<div className='RecentlyClosedWidget'>
        <h2>Recently closed</h2>
        <ScrollArea className="sessions-list" darker type="hover">
            {sessions.map(s => {
                const id = s.tab ? s.tab.sessionId : s.window!.sessionId;
                return (<Session key={id?.toString()} session={s} isMock={instanceId === 'mock'}/>);
            })}
        </ScrollArea>

    </div>)
};

const onCommandInput: OnCommandInputCallback = async (query: string) => {
    const sessions = await browser.sessions.getRecentlyClosed();
    const q = query.toLowerCase();

    return sessions.filter(s => {
        if (s.tab) {
            if (s.tab.title && s.tab.title.toLowerCase().includes(q)) return true;
            if (s.tab.url && s.tab.url.toLowerCase().includes(q)) return true;
            return false;
        } else if (s.window) {
            if (s.window.title && s.window.title.toLowerCase().includes(q)) return true;
            return false;
        }
        return false;
    }).map(s => {
        const id = s.tab ? s.tab.sessionId! : s.window!.sessionId!;
        const title = s.tab ? s.tab.title : s.window!.title;
        const favIcon = s.tab ? s.tab.favIconUrl : '';
        const icon = favIcon ? undefined : (s.tab ? 'ic:baseline-tab' : 'ic:outline-window');
        return {
            icon: icon,
            image: favIcon,
            text: title || '',
            key: id,
            hint: moment.unix(s.lastModified).fromNow(true),
            onSelected: async () => {
                await browser.sessions.restore(id);
                window.close();
            },
        }
    });
};

const widgetDescriptor = {
    id: 'recently-closed-widget',
    name: 'Recently closed tabs',
    size: {
        width: 3,
        height: 3,
    },
    configurationScreen: null,
    mainScreen: (props) => (<RequirePermissions permissions={['sessions', 'tabs']}><WidgetScreen {...props} /></RequirePermissions>),
    withAnimation: false,
    mock: () => (<WidgetScreen config={{}} instanceId='mock' />),
} satisfies WidgetDescriptor<{}>;

export const recentlyClosedPlugin = {
    id: 'recently-closed-plugin',
    name: 'Recently closed tabs',
    widgets: [
        widgetDescriptor,
    ],
    configurationScreen: null,
    onCommandInput,
} satisfies AnoriPlugin;