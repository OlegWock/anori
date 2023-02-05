import { atom, getDefaultStore, useAtom } from "jotai";
import browser, { Manifest } from 'webextension-polyfill';
import { useState } from "react";
import { ReactNode } from "react";
import { Button } from "@components/Button";
import './RequirePermissions.scss';
import { availablePermissionsAtom, containsHostPermission, normalizeHost, updateAvailablePermissions } from "@utils/permissions";
import { Modal } from "./Modal";


export type RequirePermissionsProps = {
    hosts?: string[],
    permissions?: Manifest.OptionalPermission[],
    children?: ReactNode,
    compact?: boolean,

    isMock?: boolean,
};


export const RequirePermissions = ({ hosts = [], permissions = [], children, compact, isMock }: RequirePermissionsProps) => {
    const grantPermissions = async () => {
        const granted = await browser.permissions.request({
            permissions: missingPermissions,
            origins: missingHostPermissions.map(host => {
                return `*://${normalizeHost(host)}/*`;
            }),
        });
        if (granted) updateAvailablePermissions();
        console.log('Permissions granted', granted);
    };
    const [currentPermissions, setPermissions] = useAtom(availablePermissionsAtom);
    const [modalVisible, setModalVisible] = useState(false)

    if (!currentPermissions) return null;

    const missingPermissions = permissions.filter(p => !currentPermissions.permissions.includes(p));
    const missingHostPermissions = hosts.filter(h => !containsHostPermission(currentPermissions.hosts, h));

    if (isMock || (missingPermissions.length === 0 && missingHostPermissions.length === 0)) {
        return <>{children}</>;
    } else {
        return (
            <>
                <div className="RequirePermissions" onClick={() => compact ? setModalVisible(true) : null}>
                    <h3>Eh?</h3>
                    {compact && <div className="text">Additional permissions required. Click to see details.</div>}
                    {!compact && <>
                        <div>This widget requires additional permissions. Those are:</div>
                        {missingPermissions.length !== 0 && <div>API permissions: <strong>{missingPermissions.join(', ')}</strong>.</div>}
                        {missingHostPermissions.length !== 0 && <div>Host permissions: <strong>{missingHostPermissions.join(', ')}</strong>.</div>}
                        <Button className="grant-button" onClick={grantPermissions}>Grant permissions</Button>
                    </>}
                </div>
                {modalVisible && <Modal
                    title="Additional permissions required"
                    className="RequirePermissions-modal"
                    closable
                    onClose={() => setModalVisible(false)}
                >
                    <div>This widget requires additional permissions. Those are:</div>
                    {missingPermissions.length !== 0 && <div>API permissions: <strong>{missingPermissions.join(', ')}</strong>.</div>}
                    {missingHostPermissions.length !== 0 && <div>Host permissions: <strong>{missingHostPermissions.join(', ')}</strong>.</div>}
                    <Button className="grant-button" onClick={grantPermissions}>Grant permissions</Button>
                </Modal>}
            </>)
    }
};