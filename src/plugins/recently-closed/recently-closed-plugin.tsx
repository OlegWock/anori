
import { AnoriPlugin, OnCommandInputCallback, WidgetDescriptor, WidgetRenderProps } from '@utils/user-data/types';
import './styles.scss';
import browser from 'webextension-polyfill';
import { useMemo, useState } from 'react';
import { Icon } from '@components/Icon';
import { RequirePermissions } from '@components/RequirePermissions';
import { useEffect } from 'react';
import moment from 'moment-timezone';
import { m, useAnimationControls } from 'framer-motion';
import { wait } from '@utils/misc';
import { ScrollArea } from '@components/ScrollArea';
import { translate } from '@translations/index';
import { useTranslation } from 'react-i18next';
import { RelativeTime } from '@components/RelativeTime';

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
    const { t, i18n } = useTranslation();
    const controls = useAnimationControls();
    const favIcon = session.tab ? session.tab.favIconUrl : '';
    const lastModified = useMemo(() => {
        if (X_BROWSER === 'chrome') return moment.unix(session.lastModified);
        return moment(session.lastModified);
    }, [session.lastModified, i18n.language]);

    return (<m.div
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
            {session.tab ? (session.tab.title || t('recently-closed-plugin.tab')) : (session.window?.title || t('recently-closed-plugin.window'))}
        </div>
        <div className="last-modified">
            <RelativeTime m={lastModified} withoutSuffix />
        </div>

    </m.div>)
};

const WidgetScreen = ({ config, instanceId }: WidgetRenderProps<{}>) => {
    const [sessions, setSessions] = useState<browser.Sessions.Session[]>([]);
    const { t } = useTranslation();

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
        <h2>{t('recently-closed-plugin.widgetTitle')}</h2>
        <ScrollArea className="sessions-list" darker type="hover">
            {sessions.filter(s => {
                const url = s.tab ? s.tab.url : '';
                if (url && (url.includes('pages/newtab/start.html?focused') || url.includes('chrome://newtab/'))) return false;
                return true;
            }).map(s => {
                const id = s.tab ? s.tab.sessionId : s.window!.sessionId;
                return (<Session key={id?.toString()} session={s} isMock={instanceId === 'mock'} />);
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
    get name() {
        return translate('recently-closed-plugin.widgetSizeMName');
    },
    size: {
        width: 3,
        height: 3,
    },
    configurationScreen: null,
    mainScreen: (props) => (<RequirePermissions permissions={['sessions', 'tabs']}><WidgetScreen {...props} /></RequirePermissions>),
    withAnimation: false,
    mock: () => (<WidgetScreen config={{}} instanceId='mock' />),
} satisfies WidgetDescriptor<{}>;

const widgetDescriptorS = {
    id: 'recently-closed-widget-s',
    get name() {
        return translate('recently-closed-plugin.widgetSizeSName');
    },
    size: {
        width: 2,
        height: 2,
    },
    configurationScreen: null,
    mainScreen: (props) => (<RequirePermissions permissions={['sessions', 'tabs']}><WidgetScreen {...props} /></RequirePermissions>),
    withAnimation: false,
    mock: () => (<WidgetScreen config={{}} instanceId='mock' />),
} satisfies WidgetDescriptor<{}>;

export const recentlyClosedPlugin = {
    id: 'recently-closed-plugin',
    get name() {
        return translate('recently-closed-plugin.name');
    },
    widgets: [
        widgetDescriptor,
        widgetDescriptorS,
    ],
    configurationScreen: null,
    onCommandInput,
} satisfies AnoriPlugin;