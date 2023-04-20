import { ComponentPropsWithoutRef, RefAttributes, useLayoutEffect } from 'react';
import browser from 'webextension-polyfill';
import { allSets } from './icons/all-sets';
import { IconifyJSON, Icon as OfflineIcon, addCollection } from '@iconify/react/dist/offline';
import { useForceRerender } from '@utils/hooks';
import { guid } from '@utils/misc';
import { forwardRef } from 'react';
import { useCustomIcon } from '@utils/custom-icons';
import './Icon.scss';
import clsx from 'clsx';


const isFamilyLoaded = (family: string) => {
    return loadedFamilies.includes(family);
};

const loadFamily = async (family: string) => {
    // Weird extension because of Firefox addon store bug, see generate-icons-assets.ts
    const url = browser.runtime.getURL(`/assets/icons/${family}.jsonx`);
    const resp = await fetch(url);
    const json = await resp.json() as IconifyJSON;
    addCollection(json);
};

export const requestIconsFamily = async (family: string) => {
    if (family === 'custom') return;
    if (!allSets.includes(family)) {
        console.error(`Unknown icons family ${family}, please make sure it's included in generate-icons script in root of project and run that script to regenerate icons.`);
        return;
    }

    if (loadingPromises[family] || isFamilyLoaded(family)) return;

    const promise = loadFamily(family);
    loadingPromises[family] = promise;
    await promise;
    loadingPromises[family] = undefined;
    loadedFamilies.push(family);

    Object.values(familyLoadedCallbacks).forEach(cb => cb(family));
};

const subscribeToLoadEvents = (cb: (family: string) => void): string => {
    const callbackId = guid();
    familyLoadedCallbacks[callbackId] = cb;
    return callbackId;
};

const unsubscribe = (callbackId: string) => {
    delete familyLoadedCallbacks[callbackId];
};

const loadedFamilies: string[] = [];
const loadingPromises: Record<string, Promise<void> | undefined> = {};
const familyLoadedCallbacks: Record<string, (family: string) => void> = {};

export type IconProps = {
    icon: string,
    width?: number | string,
    height?: number | string,
    className?: string,
} & ComponentPropsWithoutRef<"div">;

const CustomIcon = forwardRef<RefAttributes<HTMLElement>, IconProps>(({icon, className, ...props}, ref) => {
    const iconInfo = useCustomIcon(icon);

    if (!iconInfo) {
        // @ts-ignore incorrect ref types?
        return (<div ref={ref} style={{
            background: '#ffffff',
            borderRadius: 8,
            opacity: 0.35,
            width: props.width || props.height || 24,
            height: props.height || props.width || 24,
        }} />);
    }

    // @ts-ignore incorrect ref types?
    return (<img className={clsx('CustomIcon', className)} ref={ref} src={iconInfo.urlObject} {...props} />);
});

export const Icon = forwardRef<RefAttributes<SVGSVGElement>, IconProps>((props, ref) => {
    const [family, iconName] = props.icon.split(':');
    const rerender = useForceRerender();

    useLayoutEffect(() => {
        if (!family || isFamilyLoaded(family) || family === 'custom') return;

        const callbackId = subscribeToLoadEvents((loadedFamily) => {
            if (loadedFamily === family) {
                unsubscribe(callbackId);
                rerender();
            }
        });

        requestIconsFamily(family);
        return () => unsubscribe(callbackId);
    }, [props.icon]);

    if (family === 'custom') {
        return (<CustomIcon {...props} icon={iconName}  />);
    }

    // @ts-ignore incorrect ref typing
    return (<OfflineIcon {...props} ref={ref}>
        <div style={{
            background: '#ffffff',
            borderRadius: 8,
            opacity: 0.35,
            width: props.width || props.height || 24,
            height: props.height || props.width || 24,
        }} />
    </OfflineIcon>);
});