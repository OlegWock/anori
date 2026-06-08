import { Checkbox, type CheckboxProps } from "@anori/design-system/components/Checkbox/Checkbox";
import { Popover } from "@anori/design-system/components/Popover/Popover";
import { RequirePermissions } from "@anori/design-system/components/RequirePermissions/RequirePermissions";
import { type CorrectPermission, usePermissionsQuery } from "@anori/utils/permissions";

export type CheckboxWithPermissionProps = {
  hosts?: string[];
  permissions?: CorrectPermission[];
} & CheckboxProps;

export const CheckboxWithPermission = ({ hosts, permissions, onChange, ...props }: CheckboxWithPermissionProps) => {
  const hasRequestedPermissions = usePermissionsQuery({ hosts, permissions });

  return (
    <>
      {hasRequestedPermissions && <Checkbox onChange={onChange} {...props} />}
      {!hasRequestedPermissions && (
        <Popover
          trigger="hover"
          component={({ close }) => (
            <RequirePermissions permissions={permissions} hosts={hosts} onGrant={() => close()} />
          )}
        >
          <Checkbox disabled {...props} />
        </Popover>
      )}
    </>
  );
};
