import browser from 'webextension-polyfill';
import { useState } from "react";
import { ReactNode } from "react";
import { Button } from "@components/Button";
import './RequirePermissions.scss';
import { CorrectPermission, containsHostPermission, isPermissionSupported, normalizeHost, updateAvailablePermissions, useAvailablePermissions } from "@utils/permissions";
import { Modal } from "./Modal";
import { AnimatePresence } from "framer-motion";
import clsx from "clsx";
import { useTranslation } from "react-i18next";


export type RequirePermissionsProps = {
    additionalInfo?: string,
    enabled?: boolean,
    hosts?: string[],
    permissions?: CorrectPermission[],
    children?: ReactNode,
    compact?: boolean,
    onGrant?: () => void,
    className?: string,
};


export const RequirePermissions = ({ hosts = [], permissions = [], children, compact, onGrant, className, enabled = true, additionalInfo }: RequirePermissionsProps) => {
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

    const currentPermissions = useAvailablePermissions();
    const [modalVisible, setModalVisible] = useState(false);
    const { t } = useTranslation();

    if (!enabled) return <>{children}</>;

    if (!currentPermissions) return null;
    const missingPermissions = permissions.filter(p => !currentPermissions.permissions.includes(p)).filter(p => isPermissionSupported(p));
    const missingHostPermissions = hosts.filter(h => !containsHostPermission(currentPermissions.hosts, h));

    if ((missingPermissions.length === 0 && missingHostPermissions.length === 0)) {
        return <>{children}</>;
    } else {
        return (
            <>
                <div className={clsx("RequirePermissions", compact && "compact", className)} onClick={() => compact ? setModalVisible(true) : null}>
                    <h3>{t('requirePermissions.eh')}</h3>
                    {compact && <div className="text">{t('requirePermissions.compactText')}</div>}
                    {!compact && <>
                        <div>{t('requirePermissions.text')}</div>
                        {missingPermissions.length !== 0 && <div>{t('requirePermissions.apiPermissions')}: <strong>{missingPermissions.join(', ')}</strong>.</div>}
                        {missingHostPermissions.length !== 0 && <div>{t('requirePermissions.hostPermissions')}: <strong>{missingHostPermissions.join(', ')}</strong>.</div>}
                        {!!additionalInfo && <div className='additional-info'>{additionalInfo}</div>}
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

                        {!!additionalInfo && <div className='additional-info'>{additionalInfo}</div>}
                        <Button className="grant-button" onClick={grantPermissions}>{t('requirePermissions.grant')}</Button>
                    </Modal>}
                </AnimatePresence>
            </>)
    }
};