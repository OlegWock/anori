import { useAtom } from "jotai";
import browser from 'webextension-polyfill';
import { useState } from "react";
import { ReactNode } from "react";
import { Button } from "@components/Button";
import './RequirePermissions.scss';
import { CorrectPermission, availablePermissionsAtom, containsHostPermission, normalizeHost, updateAvailablePermissions } from "@utils/permissions";
import { Modal } from "./Modal";
import { AnimatePresence } from "framer-motion";
import clsx from "clsx";
import { useTranslation } from "react-i18next";


export type RequirePermissionsProps = {
    hosts?: string[],
    permissions?: CorrectPermission[],
    children?: ReactNode,
    compact?: boolean,
    onGrant?: () => void,

    isMock?: boolean,
};


const permissionUnavailableOnFirefox = ['favicon']

export const RequirePermissions = ({ hosts = [], permissions = [], children, compact, isMock, onGrant }: RequirePermissionsProps) => {
    const grantPermissions = async () => {
        const granted = await browser.permissions.request({
            // @ts-ignore I know what I'm doing
            permissions: missingPermissions,
            origins: missingHostPermissions.map(host => {
                return `*://${normalizeHost(host)}/*`;
            }),
        });
        if (granted) updateAvailablePermissions();
        console.log('Permissions granted', granted);
        if (onGrant) onGrant();
    };

    const [currentPermissions, setPermissions] = useAtom(availablePermissionsAtom);
    const [modalVisible, setModalVisible] = useState(false);
    const { t } = useTranslation();

    if (!currentPermissions) return null;
    const isFirefox = navigator.userAgent.includes('Firefox/');
    const missingPermissions = permissions.filter(p => !currentPermissions.permissions.includes(p)).filter(p => isFirefox ? !permissionUnavailableOnFirefox.includes(p) : true);
    const missingHostPermissions = hosts.filter(h => !containsHostPermission(currentPermissions.hosts, h));

    if (isMock || (missingPermissions.length === 0 && missingHostPermissions.length === 0)) {
        return <>{children}</>;
    } else {
        return (
            <>
                <div className={clsx("RequirePermissions", compact && "compact")} onClick={() => compact ? setModalVisible(true) : null}>
                    <h3>{t('requirePermissions.eh')}</h3>
                    {compact && <div className="text">{t('requirePermissions.compactText')}</div>}
                    {!compact && <>
                        <div>{t('requirePermissions.text')}</div>
                        {missingPermissions.length !== 0 && <div>{t('requirePermissions.apiPermissions')}: <strong>{missingPermissions.join(', ')}</strong>.</div>}
                        {missingHostPermissions.length !== 0 && <div>{t('requirePermissions.hostPermissions')}: <strong>{missingHostPermissions.join(', ')}</strong>.</div>}
                        <Button className="grant-button" onClick={grantPermissions}>{t('requirePermissions.grant')}</Button>
                    </>}
                </div>
                <AnimatePresence>
                    {modalVisible && <Modal
                        title={t('requirePermissions.modalTitle')}
                        className="RequirePermissions-modal"
                        closable
                        onClose={() => setModalVisible(false)}
                    >
                        <div>{t('requirePermissions.text')}</div>
                        {missingPermissions.length !== 0 && <div>{t('requirePermissions.apiPermissions')}: <strong>{missingPermissions.join(', ')}</strong>.</div>}
                        {missingHostPermissions.length !== 0 && <div>{t('requirePermissions.hostPermissions')}: <strong>{missingHostPermissions.join(', ')}</strong>.</div>}
                        <Button className="grant-button" onClick={grantPermissions}>{t('requirePermissions.grant')}</Button>
                    </Modal>}
                </AnimatePresence>
            </>)
    }
};