import { Button } from "@components/Button";
import { AnoriPlugin, WidgetRenderProps } from "@utils/user-data/types";
import './styles.scss';
import { RequirePermissions } from "@components/RequirePermissions";
import { useEffect, useState } from "react";
import browser from 'webextension-polyfill';
import { parseHost } from "@utils/misc";
import clsx from "clsx";
import { useLinkNavigationState } from "@utils/hooks";
import { Icon } from "@components/Icon";
import { usePluginStorage } from "@utils/plugin";

type PluginWidgetConfigType = {

};

type PluginStorageType = {
    blacklist: string[],
}

const REQUIRED_PERMISSIONS = X_BROWSER === 'firefox' ? ['topSites'] : ['topSites', 'favicon'];

const LinkPlate = ({ href, favicon, title, onRemove }: { href: string, favicon: string, title: string, onRemove: () => void }) => {
    const { onLinkClick, isNavigating } = useLinkNavigationState();

    return (<a href={href} onClick={onLinkClick}>
        {isNavigating && <Icon className="loading" icon="fluent:spinner-ios-20-regular" width={32} height={32} />}
        {!isNavigating && <img src={favicon} />}
        <div className="site-title">{title}</div>
        <Button className="remove-link" onClick={e => {
            e.preventDefault();
            e.stopPropagation();
            onRemove();
        }}><Icon icon='ion:close' width={16} height={16} /></Button>
    </a>);
};

const MainScreen = ({ config, instanceId, type }: WidgetRenderProps<PluginWidgetConfigType> & { type: 'horizontal' | 'vertical' }) => {
    const addToBlacklist = (url: string) => {
        setBlacklist(b => [...b, url]);
    };

    const store = usePluginStorage<PluginStorageType>();
    const [blacklist, setBlacklist] = store.useValue('blacklist', []);

    const [sites, setSites] = useState<browser.TopSites.MostVisitedURL[]>([]);

    useEffect(() => {
        const load = async () => {
            let data: browser.TopSites.MostVisitedURL[] = [];
            if (X_BROWSER === 'firefox') {
                data = await browser.topSites.get({ includeFavicon: true, limit: 100 });
            } else {
                data = await browser.topSites.get();
            }

            setSites(
                data.filter(s => !blacklist.includes(s.url)).slice(0, 6)
            );

        };

        load();
        const tid = setInterval(() => load(), 1000 * 60 * 5);
        return () => clearInterval(tid);
    }, [blacklist]);

    return (<div className={clsx("TopSitesWidget", type)}>
        {sites.map((s) => {
            const resUrl = new URL(browser.runtime.getURL("/_favicon/"));
            resUrl.searchParams.set("pageUrl", s.url);
            resUrl.searchParams.set("size", "32");
            const faviconUrl = X_BROWSER === 'firefox' ? (s.favicon || browser.runtime.getURL('/assets/images/icon48.png')) : resUrl.toString();

            const title = !s.title || s.title.includes('://') ? parseHost(s.url) : s.title;
            return (<LinkPlate onRemove={() => addToBlacklist(s.url)} key={s.url} href={s.url} favicon={faviconUrl} title={title} />)
        })}
    </div>);
};

const Mock = ({ type }: { type: 'horizontal' | 'vertical' }) => {
    return (<div className={clsx("TopSitesWidget", type)}>
        <a href="#">
            <img src={browser.runtime.getURL('/assets/images/icon48.png')} />
            <div className="site-title">Some site</div>
        </a>
        <a href="#">
            <img src={browser.runtime.getURL('/assets/images/icon48.png')} />
            <div className="site-title">Social media</div>
        </a>
        <a href="#">
            <img src={browser.runtime.getURL('/assets/images/icon48.png')} />
            <div className="site-title">News</div>
        </a>
        <a href="#">
            <img src={browser.runtime.getURL('/assets/images/icon48.png')} />
            <div className="site-title">Weather</div>
        </a>
        <a href="#">
            <img src={browser.runtime.getURL('/assets/images/icon48.png')} />
            <div className="site-title">Lorem</div>
        </a>
        <a href="#">
            <img src={browser.runtime.getURL('/assets/images/icon48.png')} />
            <div className="site-title">Ipsum</div>
        </a>
    </div>);
}

const widgetDescriptorHorizontal = {
    id: 'top-sites-horizontal',
    name: 'Top sites - horizontal',
    configurationScreen: null,
    withAnimation: false,
    // @ts-expect-error favicon is not present in webextension-polyfill typings yet
    mainScreen: (props) => <RequirePermissions permissions={REQUIRED_PERMISSIONS}><MainScreen type="horizontal" {...props} /></RequirePermissions>,
    mock: () => <Mock type="horizontal" />,
    size: {
        width: 4,
        height: 1,
    }
} as const;

const widgetDescriptorVertical = {
    id: 'top-sites-vertical',
    name: 'Top sites - vertical',
    configurationScreen: null,
    withAnimation: false,
    // @ts-expect-error favicon is not present in webextension-polyfill typings yet
    mainScreen: (props) => <RequirePermissions permissions={REQUIRED_PERMISSIONS}><MainScreen type="vertical" {...props} /></RequirePermissions>,
    mock: () => <Mock type="vertical" />,
    size: {
        width: 1,
        height: 4,
    }
} as const;

export const topSitesPlugin = {
    id: 'top-sites-plugin',
    name: 'Top sites',
    widgets: [
        widgetDescriptorHorizontal,
        widgetDescriptorVertical,
    ],
    configurationScreen: null,
} satisfies AnoriPlugin;