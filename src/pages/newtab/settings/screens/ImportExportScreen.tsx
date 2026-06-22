import { Alert } from "@anori/components/Alert";
import { Button } from "@anori/components/Button";
import { trackEvent } from "@anori/utils/analytics";
import { downloadBlob, showOpenFilePicker } from "@anori/utils/files";
import { anoriSchema } from "@anori/utils/storage";
import { createBackupZip, restoreBackupFromZip } from "@anori/utils/storage/backup";
import { useStorage, useStorageValue } from "@anori/utils/storage-lib";
import { m } from "framer-motion";
import moment from "moment-timezone";
import type { ComponentProps } from "react";
import { Trans, useTranslation } from "react-i18next";
import "./ImportExportScreen.scss";

export const ImportExportScreen = (props: ComponentProps<typeof m.div>) => {
  const { t } = useTranslation();
  const storage = useStorage();
  const [cloudAccount] = useStorageValue(anoriSchema.cloudAccount);
  const [cloudSyncSettings] = useStorageValue(anoriSchema.cloudSyncSettings);
  const isConnectedToCloud = cloudAccount !== null && cloudSyncSettings !== null;

  const exportSettings = async () => {
    const zipBlob = await createBackupZip(storage);
    const datetime = moment().format("yyyy-MM-DD_HH-mm");
    downloadBlob(`anori-backup-${datetime}.zip`, zipBlob);
    trackEvent("Configuration exported");
  };

  const importSettings = async () => {
    if (isConnectedToCloud) {
      const confirmed = confirm(t("settings.importExport.cloudWarning"));
      if (!confirmed) return;
    }

    const files = await showOpenFilePicker(false, ".zip");
    const file = files[0];
    if (!file) return;

    try {
      await restoreBackupFromZip(storage, file);
      trackEvent("Configuration imported");
      window.location.reload();
    } catch (err) {
      console.error("Error while importing backup", err);
      alert(t("settings.importExport.importError", { error: err instanceof Error ? err.message : String(err) }));
    }
  };

  return (
    <m.div {...props} className="ImportExportScreen">
      <Alert level="info">
        <Trans t={t} i18nKey="settings.importExport.cloudSyncHint">
          {/* biome-ignore lint/a11y/useAnchorContent: will be programatically injected by i18n */}
          <a href="https://anori.app/plus" target="_blank" rel="noopener noreferrer" />
        </Trans>
      </Alert>
      <div>{t("settings.importExport.info")}</div>
      <div className="import-export-button">
        <Button onClick={importSettings}>{t("settings.importExport.import")}</Button>
        <Button onClick={exportSettings}>{t("settings.importExport.export")}</Button>
      </div>
    </m.div>
  );
};
