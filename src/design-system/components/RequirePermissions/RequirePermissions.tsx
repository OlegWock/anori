import { Button } from "@anori/design-system/components/Button/Button";
import { EmptyState } from "@anori/design-system/components/EmptyState/EmptyState";
import { builtinIcons } from "@anori/design-system/components/Icon/builtin-icons";
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
import clsx from "clsx";
import { AnimatePresence } from "motion/react";
import type { ReactNode } from "react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { css } from "styled-system/css";
import browser from "webextension-polyfill";

// Both modes render inside a ScrollArea so the content scrolls in a small widget. Compact is a
// clickable summary that opens the modal; non-compact is the full prompt.
const compactRoot = css({ flexGrow: 1, cursor: "pointer" });
const prompt = css({ flexGrow: 1 });
const promptContent = css({ display: "flex", flexDirection: "column", gap: "3" });
// Radix wraps the viewport content in an inline `display: table` div; override it to a centered flex
// column (min-height fills the viewport) so the prompt centers when it fits and scrolls when it doesn't.
// TODO: the prompt isn't vertically centered when rendered inside the WidgetExpandArea popup
// (withoutScroll) — repro: the bookmark widget's "View in popup" action when the host permission isn't
// granted. The ScrollArea viewport doesn't fill the flex-grown scroll root there, so this
// min-height: 100% has nothing to resolve against. Centers fine in the small/compact widget case.
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
// A slightly tighter gap than the default empty state for this widget-sized prompt.
const promptEmptyState = css({ gap: "3", paddingBlock: "3" });
const text = css({ fontWeight: "light" });
const additionalInfoClass = css({ marginTop: "4" });
const grantButton = css({ alignSelf: "center", marginTop: "2", whiteSpace: "break-spaces" });
const modalClass = css({ maxWidth: "600px" });

export type RequirePermissionsProps = {
  additionalInfo?: string;
  enabled?: boolean;
  hosts?: string[];
  permissions?: CorrectPermission[];
  children?: ReactNode;
  compact?: boolean;
  onGrant?: () => void;
  className?: string;
};

export const RequirePermissions = ({
  hosts = [],
  permissions = [],
  children,
  compact,
  onGrant,
  className,
  enabled = true,
  additionalInfo,
}: RequirePermissionsProps) => {
  const grantPermissions = async () => {
    const granted = await browser.permissions.request({
      // @ts-expect-error I know what I'm doing
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

  if (compact) {
    return (
      <>
        <ScrollArea
          className={clsx(compactRoot, className)}
          contentClassName={centeredViewport}
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
    <ScrollArea className={clsx(prompt, className)} contentClassName={centeredViewport} size="thin">
      <EmptyState className={promptEmptyState} icon={builtinIcons.key} title={t("requirePermissions.modalTitle")}>
        {permDetails}
        {grantBtn}
      </EmptyState>
    </ScrollArea>
  );
};
