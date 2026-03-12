import { Button } from "@anori/components/Button";
import { trackEvent } from "@anori/utils/analytics";
import { downloadBlob, showOpenFilePicker } from "@anori/utils/files";
import { anoriSchema, anoriVersionedSchema } from "@anori/utils/storage";
import { readFile, useStorage, useStorageValue } from "@anori/utils/storage-lib";
import { m } from "framer-motion";
import JSZip from "jszip";
import moment from "moment-timezone";
import type { ComponentProps } from "react";
import { useTranslation } from "react-i18next";
import browser from "webextension-polyfill";
import "./ImportExportScreen.scss";

const BACKUP_FORMAT_VERSION = 1;

export const ImportExportScreen = (props: ComponentProps<typeof m.div>) => {
  const { t } = useTranslation();
  const storage = useStorage();
  const [cloudAccount] = useStorageValue(anoriSchema.cloudAccount);
  const [cloudSyncSettings] = useStorageValue(anoriSchema.cloudSyncSettings);
  const isConnectedToCloud = cloudAccount !== null && cloudSyncSettings !== null;

  const exportSettings = async () => {
    const zip = new JSZip();
    const { kv, files } = storage.exportForBackup();

    const exportableStorage: Record<string, unknown> = {};
    for (const [key, record] of Object.entries(kv)) {
      exportableStorage[key] = record;
    }
    for (const [key, { record }] of Object.entries(files)) {
      exportableStorage[key] = record;
    }

    zip.file("storage.json", JSON.stringify(exportableStorage, null, 2), { compression: "DEFLATE" });
    zip.file(
      "meta.json",
      JSON.stringify(
        {
          formatVersion: BACKUP_FORMAT_VERSION,
          extensionVersion: browser.runtime.getManifest().version,
          schemaVersion: anoriVersionedSchema.currentVersion,
          date: moment().toISOString(),
        },
        null,
        2,
      ),
      { compression: "DEFLATE" },
    );

    for (const { record, path } of Object.values(files)) {
      if (record.deleted) continue;
      const blob = await readFile(path);
      if (blob) {
        zip.file(`opfs/${path}`, blob, { compression: "DEFLATE" });
      }
    }

    const zipBlob = await zip.generateAsync({ type: "blob" });
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
    const zip = await JSZip.loadAsync(file);

    const metaJsonFile = zip.file("meta.json");
    if (!metaJsonFile) {
      throw new Error("Invalid backup: missing meta.json");
    }
    const backupMeta = JSON.parse(await metaJsonFile.async("string")) as { formatVersion?: number };
    if (backupMeta.formatVersion !== BACKUP_FORMAT_VERSION) {
      throw new Error(
        `Unsupported backup format version: ${backupMeta.formatVersion}. Expected ${BACKUP_FORMAT_VERSION}. This backup was created with a different version of Anori.`,
      );
    }

    const storageFile = zip.file("storage.json");
    if (!storageFile) {
      throw new Error("Invalid backup: missing storage.json");
    }
    const storageData = JSON.parse(await storageFile.async("string")) as Record<string, unknown>;

    // Extract OPFS file blobs from the zip
    const fileBlobs = new Map<string, Blob>();
    const opfsFolder = zip.folder("opfs");
    if (opfsFolder) {
      const opfsFiles = opfsFolder.filter(() => true);
      for (const opfsFile of opfsFiles) {
        const path = opfsFile.name.replace(/^opfs\//, "");
        const blob = await opfsFile.async("blob");
        fileBlobs.set(path, blob);
      }
    }

    // Preserve cloud account credentials so user stays logged in
    const currentCloudAccount = storage.get(anoriSchema.cloudAccount);

    await storage.importFromBackup({ kv: storageData, fileBlobs });

    if (currentCloudAccount) {
      await storage.set(anoriSchema.cloudAccount, currentCloudAccount);
    }

    trackEvent("Configuration imported");
    window.location.reload();
  };

  return (
    <m.div {...props} className="ImportExportScreen">
      <div>{t("settings.importExport.info")}</div>
      <div className="import-export-button">
        <Button onClick={importSettings}>{t("settings.importExport.import")}</Button>
        <Button onClick={exportSettings}>{t("settings.importExport.export")}</Button>
      </div>
    </m.div>
  );
};
