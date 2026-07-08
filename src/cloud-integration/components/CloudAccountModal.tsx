import { Alert } from "@anori/design-system/components/Alert/Alert";
import { Badge } from "@anori/design-system/components/Badge/Badge";
import { Button } from "@anori/design-system/components/Button/Button";
import { Card } from "@anori/design-system/components/Card/Card";
import { EmptyState } from "@anori/design-system/components/EmptyState/EmptyState";
import { builtinIcons } from "@anori/design-system/components/Icon/builtin-icons";
import { IconButton } from "@anori/design-system/components/IconButton/IconButton";
import { Input } from "@anori/design-system/components/Input/Input";
import { Modal } from "@anori/design-system/components/Modal/Modal";
import { downloadBlob } from "@anori/utils/files";
import { anoriSchema, anoriVersionedSchema } from "@anori/utils/storage";
import { useAnoriStorage } from "@anori/utils/storage/hooks";
import { getLatestPreUpdateBackup, type PreUpdateBackup } from "@anori/utils/storage/pre-update-backup";
import { useStorageValue } from "@anori/utils/storage-lib";
import { getAppError, isAppErrorOfType } from "@anori-app/api-client";
import { InvalidCredentialsError } from "@anori-app/api-types";
import moment from "moment";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { css } from "styled-system/css";
import { trpc } from "../api-client";
import { cancelPendingLogin, completePendingLogin, login, logout, type PendingLogin } from "../auth";
import { ACCOUNT_URL } from "../consts";
import { useCloudAccount, useIsBehindCloudSchema } from "../hooks";
import { connectToProfile, disconnectFromProfile } from "../sync-manager";

const modal = css({ width: "600px" });

const connectedView = css({ display: "flex", flexDirection: "column", gap: "6", minWidth: "25rem" });
const accountInfoRow = css({
  display: "flex",
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "4",
});
const label = css({ fontSize: "sm", opacity: 0.7 });
const accountEmail = css({ fontSize: "base", fontWeight: "medium" });
const preUpdateBackupRow = css({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "3",
});

const profilesSection = css({ display: "flex", flexDirection: "column", gap: "3" });
const profilesHeader = css({
  display: "flex",
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "3",
});
const profilesTitle = css({ fontSize: "lg", fontWeight: "medium" });
// Shared by the loading + empty notes.
const mutedNote = css({ fontSize: "sm", opacity: 0.7, paddingBlock: "2" });
const profilesList = css({ display: "flex", flexDirection: "column", gap: "2", overflowY: "auto" });
const profileItem = css({ display: "flex", flexDirection: "column", gap: "2" });
const profileHeader = css({
  display: "flex",
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "3",
});
const profileInfo = css({ display: "flex", flexDirection: "column", gap: "1", flex: 1, minWidth: 0 });
const profileName = css({ fontSize: "md", fontWeight: "medium", display: "flex", alignItems: "baseline", gap: "2" });
const profileMeta = css({ fontSize: "xs", opacity: 0.6 });
const profileActions = css({ display: "flex", gap: "1" });
const profileRenameForm = css({ display: "flex", flexDirection: "column", gap: "3", flex: 1 });
const createProfileForm = css({
  display: "flex",
  flexDirection: "column",
  gap: "3",
  padding: "3",
  background: "surface.elevated",
  borderRadius: "md",
});
const profileConfirmation = css({ display: "flex", flexDirection: "column", gap: "3", paddingTop: "3" });
// Shared by the rename / create / confirmation action rows.
const actionsRight = css({ display: "flex", flexDirection: "row", gap: "2", justifyContent: "flex-end" });

const authView = css({ minWidth: "25rem", display: "flex", flexDirection: "column", gap: "4" });
const mutedLink = {
  color: "text.primary",
  textDecoration: "underline",
  "@media (any-hover: hover)": { "&:hover": { opacity: 0.7 } },
} as const;
const plusDescription = css({
  fontSize: "sm",
  lineHeight: "1.6",
  opacity: 0.8,
  "& p": { margin: 0 },
  "& a": mutedLink,
});
const authForm = css({ display: "flex", flexDirection: "column", gap: "4" });
const loginActions = css({ display: "flex", flexDirection: "column", alignItems: "center", gap: "4" });
const userScopeConflictActions = css({ display: "flex", alignItems: "center", gap: "4" });
const registerLink = css({ textAlign: "center", fontSize: "sm", opacity: 0.8, margin: 0, "& a": mutedLink });

type Props = {
  onClose: () => void;
};

export const CloudAccountModal = ({ onClose }: Props) => {
  const { t } = useTranslation();
  const { account, isConnected } = useCloudAccount();

  return (
    <Modal className={modal} title={isConnected ? t("cloud.account") : t("cloud.login")} closable onClose={onClose}>
      {isConnected && account ? <ConnectedView account={account} /> : <AuthView />}
    </Modal>
  );
};

const ConnectedView = ({ account }: { account: NonNullable<ReturnType<typeof useCloudAccount>["account"]> }) => {
  const { t } = useTranslation();
  const isBehindCloudSchema = useIsBehindCloudSchema();
  const [preUpdateBackup, setPreUpdateBackup] = useState<PreUpdateBackup | null>(null);
  const storage = useAnoriStorage();

  useEffect(() => {
    getLatestPreUpdateBackup().then(setPreUpdateBackup);
  }, []);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [connectingProfileId, setConnectingProfileId] = useState<string | null>(null);
  const [disconnectingProfileId, setDisconnectingProfileId] = useState<string | null>(null);
  const [confirmingProfileId, setConfirmingProfileId] = useState<string | null>(null);
  const [isCreatingProfile, setIsCreatingProfile] = useState(false);
  const [isPushingProfile, setIsPushingProfile] = useState(false);
  const [newProfileName, setNewProfileName] = useState("");
  const [createProfileError, setCreateProfileError] = useState<string | null>(null);
  const [createProfileSuccess, setCreateProfileSuccess] = useState(false);
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null);
  const [editingProfileName, setEditingProfileName] = useState("");
  const [deletingProfileId, setDeletingProfileId] = useState<string | null>(null);
  const [confirmDeleteProfileId, setConfirmDeleteProfileId] = useState<string | null>(null);
  const {
    data: profilesData,
    isLoading: isLoadingProfiles,
    error: profilesError,
    refetch: refetchProfiles,
  } = trpc.sync.listProfiles.useQuery();
  const createProfileMutation = trpc.sync.createProfile.useMutation();
  const updateProfileMutation = trpc.sync.updateProfile.useMutation();
  const deleteProfileMutation = trpc.sync.deleteProfile.useMutation();
  const [syncSettings] = useStorageValue(anoriSchema.cloudSyncSettings);
  const connectedProfileId = syncSettings?.profileId ?? null;

  const sortedProfiles = useMemo(() => {
    if (!profilesData) return [];
    return [...profilesData.profiles].sort((a, b) => {
      if (a.id === connectedProfileId) return -1;
      if (b.id === connectedProfileId) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [profilesData, connectedProfileId]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await logout();
    setIsLoggingOut(false);
  };

  const handleConnectClick = (profileId: string) => {
    setConfirmingProfileId(profileId);
  };

  const handleConfirmConnect = async () => {
    if (!confirmingProfileId) return;

    const profileId = confirmingProfileId;
    setConnectingProfileId(profileId);
    setConfirmingProfileId(null);

    try {
      await connectToProfile(storage, profileId, "pull");
    } catch (error) {
      console.error("Failed to connect:", error);
      setConfirmingProfileId(profileId);
    } finally {
      setConnectingProfileId(null);
    }
  };

  const handleCreateProfile = async () => {
    if (!newProfileName.trim()) {
      setCreateProfileError(t("cloud.error.profileNameRequired"));
      return;
    }

    setCreateProfileError(null);
    setCreateProfileSuccess(false);
    setIsCreatingProfile(true);
    setIsPushingProfile(true);

    try {
      const newProfile = await createProfileMutation.mutateAsync({
        name: newProfileName.trim(),
        schemaVersion: anoriVersionedSchema.currentVersion,
      });
      await connectToProfile(storage, newProfile.id, "push");
      setNewProfileName("");
      setCreateProfileSuccess(true);
      await refetchProfiles();
    } catch (error) {
      console.error("Failed to create profile:", error);
      setCreateProfileError(t("cloud.error.failedToCreateProfile"));
    } finally {
      setIsPushingProfile(false);
      setIsCreatingProfile(false);
    }
  };

  const handleDisconnect = async () => {
    if (!connectedProfileId) return;
    setDisconnectingProfileId(connectedProfileId);
    try {
      await disconnectFromProfile(storage);
    } finally {
      setDisconnectingProfileId(null);
    }
  };

  const handleRenameProfile = async (profileId: string) => {
    if (!editingProfileName.trim()) return;
    try {
      await updateProfileMutation.mutateAsync({ profileId, name: editingProfileName.trim() });
      setEditingProfileId(null);
      setEditingProfileName("");
      await refetchProfiles();
    } catch (error) {
      console.error("Failed to rename profile:", error);
    }
  };

  const handleDeleteProfile = async (profileId: string) => {
    setDeletingProfileId(profileId);
    try {
      if (connectedProfileId === profileId) {
        await disconnectFromProfile(storage);
      }
      await deleteProfileMutation.mutateAsync({ profileId });
      setConfirmDeleteProfileId(null);
      await refetchProfiles();
    } catch (error) {
      console.error("Failed to delete profile:", error);
    } finally {
      setDeletingProfileId(null);
    }
  };

  return (
    <div className={connectedView}>
      {isBehindCloudSchema && <Alert variant="warning">{t("cloud.syncPausedBehind")}</Alert>}
      {preUpdateBackup && (
        <Alert variant="info">
          <div className={preUpdateBackupRow}>
            <span>{t("cloud.preUpdateBackup", { date: moment(preUpdateBackup.date).format("lll") })}</span>
            <Button size="compact" onClick={() => downloadBlob("anori-pre-update-backup.zip", preUpdateBackup.blob)}>
              {t("cloud.downloadBackup")}
            </Button>
          </div>
        </Alert>
      )}
      <div>
        <div className={accountInfoRow}>
          <div>
            <div className={label}>{t("cloud.connectedAs")}</div>
            <div className={accountEmail}>{account.email}</div>
          </div>
          <IconButton
            variant="ghost"
            icon={builtinIcons.logout}
            loading={isLoggingOut}
            label={t("cloud.logout")}
            onClick={handleLogout}
          />
        </div>
      </div>

      <div className={profilesSection}>
        <div className={profilesHeader}>
          <div className={profilesTitle}>{t("cloud.profiles")}</div>
          {!isCreatingProfile && (
            <IconButton
              variant="ghost"
              label={t("cloud.createProfile")}
              icon={builtinIcons.add}
              onClick={() => {
                setIsCreatingProfile(true);
                setCreateProfileSuccess(false);
              }}
            />
          )}
        </div>
        {isLoadingProfiles && <div className={mutedNote}>{t("loading")}</div>}
        {profilesError && (
          <Alert variant="accent">{getAppError(profilesError)?.message ?? t("cloud.error.failedToLoadProfiles")}</Alert>
        )}
        {createProfileSuccess && <Alert variant="info">{t("cloud.profileCreatedSuccess")}</Alert>}
        {isCreatingProfile && (
          <div className={createProfileForm}>
            {createProfileError && <Alert variant="accent">{createProfileError}</Alert>}
            <Input
              placeholder={t("cloud.profileName")}
              value={newProfileName}
              onValueChange={setNewProfileName}
              autoFocus
            />
            <div className={actionsRight}>
              <Button
                variant="secondary"
                size="compact"
                onClick={() => {
                  setIsCreatingProfile(false);
                  setNewProfileName("");
                  setCreateProfileError(null);
                }}
                disabled={isPushingProfile}
              >
                {t("cloud.cancel")}
              </Button>
              <Button
                variant="primary"
                size="compact"
                onClick={handleCreateProfile}
                loading={isPushingProfile}
                disabled={!newProfileName.trim()}
              >
                {t("cloud.create")}
              </Button>
            </div>
          </div>
        )}
        {profilesData && (
          <div className={profilesList}>
            {sortedProfiles.length === 0 && !isCreatingProfile ? (
              <EmptyState title={t("cloud.noProfiles")} />
            ) : (
              sortedProfiles.map((profile) => {
                const isConnected = connectedProfileId === profile.id;
                const isConnecting = connectingProfileId === profile.id;
                const isDisconnecting = disconnectingProfileId === profile.id;
                const showConfirmation = confirmingProfileId === profile.id;
                const isEditing = editingProfileId === profile.id;
                const showDeleteConfirm = confirmDeleteProfileId === profile.id;
                const isDeleting = deletingProfileId === profile.id;
                return (
                  <Card
                    key={profile.id}
                    padding="3"
                    borderRadius="md"
                    bg="surface.elevated"
                    boxShadow="surface.elevated.edge"
                  >
                    <div className={profileItem}>
                      {isEditing ? (
                        <div className={profileRenameForm}>
                          <Input
                            value={editingProfileName}
                            onValueChange={setEditingProfileName}
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleRenameProfile(profile.id);
                              if (e.key === "Escape") setEditingProfileId(null);
                            }}
                          />
                          <div className={actionsRight}>
                            <Button variant="secondary" onClick={() => setEditingProfileId(null)} size="compact">
                              {t("cloud.cancel")}
                            </Button>
                            <Button
                              variant="primary"
                              onClick={() => handleRenameProfile(profile.id)}
                              size="compact"
                              loading={updateProfileMutation.isPending}
                              disabled={!editingProfileName.trim()}
                            >
                              {t("save")}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className={profileHeader}>
                          <div className={profileInfo}>
                            <div className={profileName}>
                              {profile.name}
                              {isConnected && <Badge>{t("cloud.connected")}</Badge>}
                            </div>
                            <div className={profileMeta}>
                              {t("cloud.createdAt", { date: moment(profile.createdAt).format("ll") })}
                              {profile.lastWriteAt && (
                                <>
                                  {" · "}
                                  {t("cloud.lastSyncedAt", { date: moment(profile.lastWriteAt).fromNow() })}
                                </>
                              )}
                            </div>
                          </div>
                          <div className={profileActions}>
                            {isConnected ? (
                              <IconButton
                                variant="ghost"
                                size="compact"
                                icon={builtinIcons.unlink}
                                label={t("cloud.disconnect")}
                                onClick={handleDisconnect}
                                loading={isDisconnecting}
                              />
                            ) : (
                              <Button
                                variant={connectedProfileId ? "frosted" : "primary"}
                                onClick={() => handleConnectClick(profile.id)}
                                loading={isConnecting}
                                size="compact"
                              >
                                {t("cloud.connect")}
                              </Button>
                            )}
                            <IconButton
                              variant="ghost"
                              size="compact"
                              icon={builtinIcons.pencil}
                              label={t("cloud.rename")}
                              onClick={() => {
                                setEditingProfileId(profile.id);
                                setEditingProfileName(profile.name);
                              }}
                            />
                            <IconButton
                              variant="ghost"
                              size="compact"
                              icon={builtinIcons.trash}
                              label={t("cloud.delete")}
                              onClick={() => setConfirmDeleteProfileId(profile.id)}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                    {showConfirmation && (
                      <div className={profileConfirmation}>
                        <Alert variant="warning">
                          {t("cloud.connectConfirmation.message", { profileName: profile.name })}
                        </Alert>
                        <div className={actionsRight}>
                          <Button
                            variant="secondary"
                            size="compact"
                            onClick={handleConfirmConnect}
                            loading={isConnecting}
                          >
                            {t("cloud.confirm")}
                          </Button>
                          <Button
                            variant="secondary"
                            size="compact"
                            onClick={() => setConfirmingProfileId(null)}
                            disabled={isConnecting}
                          >
                            {t("cloud.cancel")}
                          </Button>
                        </div>
                      </div>
                    )}
                    {showDeleteConfirm && (
                      <div className={profileConfirmation}>
                        <Alert variant="danger">{t("cloud.deleteConfirmation", { profileName: profile.name })}</Alert>
                        <div className={actionsRight}>
                          <Button
                            variant="secondary"
                            size="compact"
                            onClick={() => handleDeleteProfile(profile.id)}
                            loading={isDeleting}
                          >
                            {t("cloud.confirm")}
                          </Button>
                          <Button
                            variant="primary"
                            size="compact"
                            onClick={() => setConfirmDeleteProfileId(null)}
                            disabled={isDeleting}
                          >
                            {t("cloud.cancel")}
                          </Button>
                        </div>
                      </div>
                    )}
                  </Card>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const AuthView = () => {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [pendingLogin, setPendingLogin] = useState<PendingLogin | null>(null);

  const handleLogin = async () => {
    setError(null);
    setIsLoading(true);

    try {
      const result = await login(email, password);
      if (result.status === "userDataConflict") {
        setPendingLogin(result.pending);
      }
    } catch (e) {
      if (isAppErrorOfType(e, InvalidCredentialsError)) {
        setError(t("cloud.error.invalidCredentials"));
      } else {
        setError(getAppError(e)?.message ?? t("cloud.error.unknown"));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResolveConflict = async (localUserData: "upload" | "discard") => {
    if (!pendingLogin) return;
    setError(null);
    setIsLoading(true);

    try {
      await completePendingLogin(pendingLogin, localUserData);
      setPendingLogin(null);
    } catch (e) {
      setError(getAppError(e)?.message ?? t("cloud.error.unknown"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelConflict = async () => {
    setPendingLogin(null);
    await cancelPendingLogin();
  };

  if (pendingLogin) {
    return (
      <div className={authView}>
        {error && <Alert variant="accent">{error}</Alert>}
        <p>{t("cloud.userDataConflict.description")}</p>
        <div className={userScopeConflictActions}>
          <Button variant="primary" loading={isLoading} onClick={() => handleResolveConflict("upload")}>
            {t("cloud.userDataConflict.upload")}
          </Button>

          <Button variant="secondary" loading={isLoading} onClick={() => handleResolveConflict("discard")}>
            {t("cloud.userDataConflict.discard")}
          </Button>
          <Button variant="secondary" disabled={isLoading} onClick={handleCancelConflict}>
            {t("cloud.cancel")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={authView}>
      <div className={plusDescription}>
        <p>{t("cloud.plusDescription")}</p>
        <a href="https://anori.app/plus" target="_blank" rel="noopener noreferrer">
          {t("cloud.learnMore")}
        </a>
      </div>
      <form
        className={authForm}
        onSubmit={(e) => {
          e.preventDefault();
          handleLogin();
        }}
      >
        {error && <Alert variant="accent">{error}</Alert>}

        <Input type="email" placeholder={t("cloud.email")} value={email} onValueChange={setEmail} />
        <Input type="password" placeholder={t("cloud.password")} value={password} onValueChange={setPassword} />

        <div className={loginActions}>
          <Button variant="primary" type="submit" loading={isLoading}>
            {t("cloud.login")}
          </Button>
          <p className={registerLink}>
            {t("cloud.noAccount")}{" "}
            <a href={`${ACCOUNT_URL}/register`} target="_blank" rel="noopener noreferrer">
              {t("cloud.createAccount")}
            </a>
          </p>
        </div>
      </form>
    </div>
  );
};
