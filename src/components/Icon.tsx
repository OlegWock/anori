import { ComponentPropsWithoutRef, RefAttributes, useLayoutEffect, useMemo, useState } from 'react';
import browser from 'webextension-polyfill';
import { allSets } from './icons/all-sets';
import { IconifyJSON, Icon as OfflineIcon, addCollection } from '@iconify/react/dist/offline';
import { useForceRerender } from '@utils/hooks';
import { guid } from '@utils/misc';
import { forwardRef } from 'react';
import { useCustomIcon } from '@utils/custom-icons';
import './Icon.scss';
import clsx from 'clsx';
import { useAtomValue } from 'jotai';
import { availablePermissionsAtom } from '@utils/permissions';
import { motion } from 'framer-motion';


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

type BaseIconProps = {
    width?: number | string,
    height?: number | string,
    className?: string,
} & ComponentPropsWithoutRef<typeof motion.div>

export type IconProps = {
    icon: string,
} & BaseIconProps;

const CustomIcon = forwardRef<RefAttributes<HTMLElement>, IconProps>(({ icon, className, ...props }, ref) => {
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
    return (<motion.img className={clsx('CustomIcon', className)} ref={ref} src={iconInfo.urlObject} {...props} />);
});

const MotionOfflineIcon = motion(OfflineIcon);

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
        return (<CustomIcon {...props} icon={iconName} />);
    }

    // @ts-ignore incorrect ref typing
    return (<MotionOfflineIcon {...props} ref={ref}>
        <motion.div style={{
            background: '#ffffff',
            borderRadius: 8,
            opacity: 0.35,
            width: props.width || props.height || 24,
            height: props.height || props.width || 24,
        }} />
    </MotionOfflineIcon>);
});


type FaviconProps = {
    url: string,
    fallback?: string,
    useFaviconApiIfPossible?: boolean,
} & BaseIconProps;

export const Favicon = forwardRef<HTMLElement, FaviconProps>((props, ref) => {
    const permissions = useAtomValue(availablePermissionsAtom);
    const hasPermission = permissions?.permissions.includes('favicon');
    const [imageError, setImageError] = useState(false);

    const iconUrl = useMemo(() => {
        const size = (props.width || props.height || 64).toString();
        if (hasPermission && props.useFaviconApiIfPossible) {
            const resUrl = new URL(browser.runtime.getURL("/_favicon/"));
            resUrl.searchParams.set("pageUrl", props.url);
            resUrl.searchParams.set("size", size);
            return resUrl.toString();
        } else {
            try {
                const host = new URL(props.url).host;
                return `https://magnificent-orange-damselfly.faviconkit.com/${host}/${size}`;
            } catch (err) {
                console.log('Error parsing host from', props.url);
                return '';
            }
        }
    }, [hasPermission, props.url])



    if (iconUrl && !imageError) {
        // @ts-ignore incorrect ref typing
        return (<img src={iconUrl} onError={() => setImageError(true)} {...props} ref={ref} />);
    }

    // @ts-ignore incorrect ref typing
    return (<Icon icon={props.fallback || 'ic:baseline-tab'} {...props} ref={ref} />);
});