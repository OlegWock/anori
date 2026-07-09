import { Button } from "@anori/design-system/components/Button/Button";
import { EmptyState } from "@anori/design-system/components/EmptyState/EmptyState";
import { builtinIcons } from "@anori/design-system/components/Icon/builtin-icons";
import { Icon } from "@anori/design-system/components/Icon/Icon";
import { ListItem } from "@anori/design-system/components/ListItem/ListItem";
import { Modal } from "@anori/design-system/components/Modal/Modal";
import { ScrollArea } from "@anori/design-system/components/ScrollArea/ScrollArea";
import {
  type CorrectPermission,
  containsHostPermission,
  isPermissionSupported,
  normalizeHost,
  updateAvailablePermissions,
  useAvailablePermissions,
} from "@anori/utils/permissions";
import { AnimatePresence } from "motion/react";
import type { ReactNode } from "react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { css, cx } from "styled-system/css";
import browser from "webextension-polyfill";

const compactRoot = css({ flexGrow: 1, cursor: "pointer" });
const prompt = css({ flexGrow: 1 });
const promptContent = css({ display: "flex", flexDirection: "column", gap: "3", maxWidth: "40rem" });
const centeredViewport = css({
  "& > div": {
    display: "flex !important",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    minHeight: "100%",
    textAlign: "center",
  },
});
const promptEmptyState = css({ gap: "3", paddingBlock: "3", maxWidth: "40rem" });
const listItemLabel = css({ flex: 1, minWidth: 0 });
const text = css({ fontWeight: "light" });
const additionalInfoClass = css({ marginTop: "4" });
const grantButton = css({ alignSelf: "center", marginTop: "2", whiteSpace: "break-spaces" });
const modalClass = css({ maxWidth: "600px" });

export type RequirePermissionsVariant = "full" | "compact" | "list-item";

export type RequirePermissionsProps = {
  additionalInfo?: string;
  enabled?: boolean;
  hosts?: string[];
  permissions?: CorrectPermission[];
  children?: ReactNode;
  variant?: RequirePermissionsVariant;
  onGrant?: () => void;
  className?: string;
};

export const RequirePermissions = ({
  hosts = [],
  permissions = [],
  children,
  variant = "full",
  onGrant,
  className,
  enabled = true,
  additionalInfo,
}: RequirePermissionsProps) => {
  const grantPermissions = async () => {
    const granted = await browser.permissions.request({
      // @ts-expect-error Incompatible types between webextension-polyfill and what is actually available in Chrome
      permissions: missingPermissions,
      origins: missingHostPermissions.map((host) => {
        return `*://${normalizeHost(host)}/*`;
      }),
    });
    if (granted) updateAvailablePermissions();
    console.log("Permissions granted", granted);
    if (onGrant) onGrant();
  };

  const currentPermissions = useAvailablePermissions();
  const [modalVisible, setModalVisible] = useState(false);
  const { t } = useTranslation();

  if (!enabled) return <>{children}</>;

  if (!currentPermissions) return null;
  const missingPermissions = permissions
    .filter((p) => !currentPermissions.permissions.includes(p))
    .filter((p) => isPermissionSupported(p));
  const missingHostPermissions = hosts.filter((h) => !containsHostPermission(currentPermissions.hosts, h));

  if (missingPermissions.length === 0 && missingHostPermissions.length === 0) {
    return <>{children}</>;
  }

  const permDetails = (
    <>
      {missingPermissions.length !== 0 && (
        <div>
          {t("requirePermissions.apiPermissions")}: <strong>{missingPermissions.join(", ")}</strong>.
        </div>
      )}
      {missingHostPermissions.length !== 0 && (
        <div>
          {t("requirePermissions.hostPermissions")}: <strong>{missingHostPermissions.join(", ")}</strong>.
        </div>
      )}
      {!!additionalInfo && <div className={additionalInfoClass}>{additionalInfo}</div>}
    </>
  );

  const grantBtn = (
    <Button className={grantButton} onClick={grantPermissions}>
      {t("requirePermissions.grant")}
    </Button>
  );

  if (variant === "list-item") {
    return (
      <ListItem as="button" type="button" className={className} onClick={grantPermissions}>
        <Icon icon={builtinIcons.key} width={18} color="icon" />
        <span className={listItemLabel}>{additionalInfo ?? t("requirePermissions.grant")}</span>
      </ListItem>
    );
  }

  if (variant === "compact") {
    return (
      <>
        <ScrollArea
          className={cx(compactRoot, className)}
          viewportClassName={centeredViewport}
          size="thin"
          role="button"
          tabIndex={0}
          onClick={() => setModalVisible(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setModalVisible(true);
            }
          }}
        >
          <div className={text}>{t("requirePermissions.compactText")}</div>
        </ScrollArea>
        <AnimatePresence>
          {modalVisible && (
            <Modal
              title={t("requirePermissions.modalTitle")}
              className={modalClass}
              closable
              onClose={() => setModalVisible(false)}
            >
              <div className={promptContent}>
                <div>{t("requirePermissions.text")}</div>
                {permDetails}
                {grantBtn}
              </div>
            </Modal>
          )}
        </AnimatePresence>
      </>
    );
  }

  return (
    <ScrollArea className={cx(prompt, className)} viewportClassName={centeredViewport} size="thin">
      <EmptyState className={promptEmptyState} icon={builtinIcons.key} title={t("requirePermissions.modalTitle")}>
        {permDetails}
        {grantBtn}
      </EmptyState>
    </ScrollArea>
  );
};
