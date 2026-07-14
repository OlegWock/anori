import { Alert } from "@anori/design-system/components/Alert/Alert";
import { Badge } from "@anori/design-system/components/Badge/Badge";
import { Button } from "@anori/design-system/components/Button/Button";
import { Card } from "@anori/design-system/components/Card/Card";
import { EmptyState } from "@anori/design-system/components/EmptyState/EmptyState";
import { builtinIcons } from "@anori/design-system/components/Icon/builtin-icons";
import { IconButton } from "@anori/design-system/components/IconButton/IconButton";
import { Input } from "@anori/design-system/components/Input/Input";
import { getAppError } from "@anori-app/api-client";
import moment from "moment";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { css } from "styled-system/css";
import { trpc } from "../api-client";
import { ensureDeviceRegistered } from "../device-registration";

const section = css({ display: "flex", flexDirection: "column", gap: "3" });
const title = css({ fontSize: "lg", fontWeight: "medium" });
const list = css({ display: "flex", flexDirection: "column", gap: "2" });
const mutedNote = css({ fontSize: "sm", opacity: 0.7, paddingBlock: "2" });
const deviceHeader = css({
  display: "flex",
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "3",
});
const deviceInfo = css({ display: "flex", flexDirection: "column", gap: "1", flex: 1, minWidth: 0 });
const deviceName = css({ fontSize: "md", fontWeight: "medium", display: "flex", alignItems: "baseline", gap: "2" });
const deviceMeta = css({ fontSize: "xs", opacity: 0.6 });
const renameForm = css({ display: "flex", flexDirection: "column", gap: "3", flex: 1 });
const actionsRight = css({ display: "flex", flexDirection: "row", gap: "2", justifyContent: "flex-end" });

export const DevicesSection = () => {
  const { t } = useTranslation();
  const { data, isLoading, error, refetch } = trpc.auth.listDevices.useQuery();
  const renameMutation = trpc.auth.renameDevice.useMutation();
  const [editingDeviceId, setEditingDeviceId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  useEffect(() => {
    let cancelled = false;
    ensureDeviceRegistered().then(() => {
      if (!cancelled) refetch();
    });
    return () => {
      cancelled = true;
    };
  }, [refetch]);

  const sortedDevices = useMemo(() => {
    if (!data) return [];
    return [...data.devices].sort((a, b) => {
      if (a.isCurrentDevice !== b.isCurrentDevice) return a.isCurrentDevice ? -1 : 1;
      return Date.parse(b.lastActiveAt) - Date.parse(a.lastActiveAt);
    });
  }, [data]);

  const handleRename = async (deviceId: string) => {
    const name = editingName.trim();
    if (!name) return;
    try {
      await renameMutation.mutateAsync({ deviceId, name });
      setEditingDeviceId(null);
      setEditingName("");
      await refetch();
    } catch (renameError) {
      console.error("Failed to rename device:", renameError);
    }
  };

  return (
    <div className={section}>
      <div className={title}>{t("cloud.devices.title")}</div>
      {isLoading && <div className={mutedNote}>{t("loading")}</div>}
      {error && <Alert variant="accent">{getAppError(error)?.message ?? t("cloud.error.failedToLoadDevices")}</Alert>}
      {data && (
        <div className={list}>
          {sortedDevices.length === 0 ? (
            <EmptyState title={t("cloud.devices.empty")} />
          ) : (
            sortedDevices.map((device) => {
              const isEditing = editingDeviceId === device.deviceId;
              const metaParts = [device.browser, device.os].filter(Boolean).join(" · ");
              return (
                <Card
                  key={device.deviceId}
                  padding="3"
                  borderRadius="md"
                  bg="surface.elevated"
                  boxShadow="surface.elevated.edge"
                >
                  {isEditing ? (
                    <div className={renameForm}>
                      <Input
                        value={editingName}
                        onValueChange={setEditingName}
                        placeholder={t("cloud.devices.namePlaceholder")}
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleRename(device.deviceId);
                          if (e.key === "Escape") setEditingDeviceId(null);
                        }}
                      />
                      <div className={actionsRight}>
                        <Button variant="secondary" size="compact" onClick={() => setEditingDeviceId(null)}>
                          {t("cloud.cancel")}
                        </Button>
                        <Button
                          variant="primary"
                          size="compact"
                          onClick={() => handleRename(device.deviceId)}
                          loading={renameMutation.isPending}
                          disabled={!editingName.trim()}
                        >
                          {t("save")}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className={deviceHeader}>
                      <div className={deviceInfo}>
                        <div className={deviceName}>
                          {device.name}
                          {device.isCurrentDevice && <Badge>{t("cloud.devices.thisDevice")}</Badge>}
                        </div>
                        <div className={deviceMeta}>
                          {metaParts}
                          {metaParts && " · "}
                          {t("cloud.devices.lastActive", { date: moment(device.lastActiveAt).fromNow() })}
                        </div>
                      </div>
                      <IconButton
                        variant="ghost"
                        size="compact"
                        icon={builtinIcons.pencil}
                        label={t("cloud.devices.rename")}
                        onClick={() => {
                          setEditingDeviceId(device.deviceId);
                          setEditingName(device.name);
                        }}
                      />
                    </div>
                  )}
                </Card>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
