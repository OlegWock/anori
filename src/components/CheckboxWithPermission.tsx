import { CorrectPermission, usePermissionsQuery } from "@utils/permissions";
import { Checkbox, CheckboxProps } from "./Checkbox";
import { Popover } from "./Popover";
import { RequirePermissions } from "./RequirePermissions";

export type CheckboxWithPermissionProps = {
    hosts?: string[],
    permissions?: CorrectPermission[],
} & CheckboxProps;

export const CheckboxWithPermission = ({ hosts, permissions, onChange, ...props }: CheckboxWithPermissionProps) => {
    const hasRequestedPermissions = usePermissionsQuery({ hosts, permissions });

    return (<>
        {hasRequestedPermissions && <Checkbox onChange={onChange} {...props} />}
        {!hasRequestedPermissions && <Popover trigger="hover" component={({ close }) => <RequirePermissions permissions={permissions} hosts={hosts} onGrant={() => close()} />}>
            <Checkbox disabled {...props} />
        </Popover>}
    </>);
};