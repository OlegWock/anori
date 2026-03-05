import { getAppError, isAppErrorOfType } from "@anori-app/api-client";
import { InvalidCredentialsError } from "@anori-app/api-types";
import { Alert } from "@anori/components/Alert";
import { Button } from "@anori/components/Button";
import { Input } from "@anori/components/Input";
import { Modal } from "@anori/components/Modal";
import { anoriSchema } from "@anori/utils/storage";
import { useStorageValue } from "@anori/utils/storage-lib";
import moment from "moment";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { trpc } from "../api-client";
import { login, logout } from "../auth";
import { ACCOUNT_URL } from "../consts";
import { useCloudAccount } from "../hooks";
import { connectToProfile, disconnectFromProfile } from "../sync-manager";
import "./CloudAccountModal.scss";
import { useAnoriStorage } from "@anori/utils/storage/hooks";

type Props = {
  onClose: () => void;
};

export const CloudAccountModal = ({ onClose }: Props) => {
  const { t } = useTranslation();
  const { account, isConnected } = useCloudAccount();

  return (
    <Modal
      className="CloudAccountModal"
      title={isConnected ? t("cloud.account") : t("cloud.login")}
      closable
      onClose={onClose}
    >
      {isConnected && account ? <ConnectedView account={account} /> : <AuthView />}
    </Modal>
  );
};

const ConnectedView = ({ account }: { account: NonNullable<ReturnType<typeof useCloudAccount>["account"]> }) => {
  const { t } = useTranslation();
  const storage = useAnoriStorage();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [connectingProfileId, setConnectingProfileId] = useState<string | null>(null);
  const [disconnectingProfileId, setDisconnectingProfileId] = useState<string | null>(null);
  const [confirmingProfileId, setConfirmingProfileId] = useState<string | null>(null);
  const [isCreatingProfile, setIsCreatingProfile] = useState(false);
  const [isPushingProfile, setIsPushingProfile] = useState(false);
  const [newProfileName, setNewProfileName] = useState("");
  const [createProfileError, setCreateProfileError] = useState<string | null>(null);
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
    setIsCreatingProfile(true);
    setIsPushingProfile(true);

    try {
      const newProfile = await createProfileMutation.mutateAsync({ name: newProfileName.trim() });
      await connectToProfile(storage, newProfile.id, "push");
      setNewProfileName("");
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
    <div className="CloudAccountModal-connected">
      <div className="account-info">
        <div className="account-info-row">
          <div>
            <div className="label">{t("cloud.connectedAs")}</div>
            <div className="email">{account.email}</div>
          </div>
          <Button onClick={handleLogout} loading={isLoggingOut} size="compact">
            {t("cloud.logout")}
          </Button>
        </div>
      </div>

      <div className="profiles-section">
        <div className="profiles-header">
          <div className="label">{t("cloud.profiles")}</div>
          <Button onClick={() => setIsCreatingProfile(true)} size="compact" disabled={isCreatingProfile}>
            {t("cloud.createProfile")}
          </Button>
        </div>
        {isLoadingProfiles && <div className="profiles-loading">{t("loading")}</div>}
        {profilesError && (
          <Alert level="attention">
            {getAppError(profilesError)?.message ?? t("cloud.error.failedToLoadProfiles")}
          </Alert>
        )}
        {isCreatingProfile && (
          <div className="create-profile-form">
            {createProfileError && <Alert level="attention">{createProfileError}</Alert>}
            <Input
              placeholder={t("cloud.profileName")}
              value={newProfileName}
              onValueChange={setNewProfileName}
              autoFocus
            />
            <div className="create-profile-actions">
              <Button
                onClick={() => {
                  setIsCreatingProfile(false);
                  setNewProfileName("");
                  setCreateProfileError(null);
                }}
                disabled={isPushingProfile}
              >
                {t("cloud.cancel")}
              </Button>
              <Button onClick={handleCreateProfile} loading={isPushingProfile} disabled={!newProfileName.trim()}>
                {t("cloud.create")}
              </Button>
            </div>
          </div>
        )}
        {profilesData && (
          <div className="profiles-list">
            {sortedProfiles.length === 0 && !isCreatingProfile ? (
              <div className="profiles-empty">{t("cloud.noProfiles")}</div>
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
                  <div
                    key={profile.id}
                    className={isConnected ? "profile-card profile-card-connected" : "profile-card"}
                  >
                    <div className="profile-item">
                      {isEditing ? (
                        <div className="profile-rename-form">
                          <Input
                            value={editingProfileName}
                            onValueChange={setEditingProfileName}
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleRenameProfile(profile.id);
                              if (e.key === "Escape") setEditingProfileId(null);
                            }}
                          />
                          <div className="profile-rename-actions">
                            <Button onClick={() => setEditingProfileId(null)} size="compact">
                              {t("cloud.cancel")}
                            </Button>
                            <Button
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
                        <>
                          <div className="profile-header">
                            <div className="profile-info">
                              <div className="profile-name">
                                {profile.name}
                                {isConnected && <span className="profile-connected-badge">{t("cloud.connected")}</span>}
                              </div>
                              <div className="profile-meta">
                                {t("cloud.createdAt", { date: moment(profile.createdAt).format("ll") })}
                                {profile.lastWriteAt && (
                                  <>
                                    {" · "}
                                    {t("cloud.lastSyncedAt", { date: moment(profile.lastWriteAt).fromNow() })}
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="profile-actions">
                            {isConnected ? (
                              <Button onClick={handleDisconnect} loading={isDisconnecting} size="compact">
                                {t("cloud.disconnect")}
                              </Button>
                            ) : (
                              <Button
                                onClick={() => handleConnectClick(profile.id)}
                                loading={isConnecting}
                                size="compact"
                              >
                                {t("cloud.connect")}
                              </Button>
                            )}
                            <Button
                              onClick={() => {
                                setEditingProfileId(profile.id);
                                setEditingProfileName(profile.name);
                              }}
                              size="compact"
                            >
                              {t("cloud.rename")}
                            </Button>
                            <Button onClick={() => setConfirmDeleteProfileId(profile.id)} size="compact">
                              {t("cloud.delete")}
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                    {showConfirmation && (
                      <div className="profile-confirmation">
                        <Alert level="attention">
                          {t("cloud.connectConfirmation.message", { profileName: profile.name })}
                        </Alert>
                        <div className="confirmation-actions">
                          <Button onClick={handleConfirmConnect} loading={isConnecting}>
                            {t("cloud.confirm")}
                          </Button>
                          <Button onClick={() => setConfirmingProfileId(null)} disabled={isConnecting}>
                            {t("cloud.cancel")}
                          </Button>
                        </div>
                      </div>
                    )}
                    {showDeleteConfirm && (
                      <div className="profile-confirmation">
                        <Alert level="attention">{t("cloud.deleteConfirmation", { profileName: profile.name })}</Alert>
                        <div className="confirmation-actions">
                          <Button onClick={() => handleDeleteProfile(profile.id)} loading={isDeleting}>
                            {t("cloud.confirm")}
                          </Button>
                          <Button onClick={() => setConfirmDeleteProfileId(null)} disabled={isDeleting}>
                            {t("cloud.cancel")}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
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

  const handleLogin = async () => {
    setError(null);
    setIsLoading(true);

    try {
      await login(email, password);
    } catch (e) {
      if (isAppErrorOfType(e, InvalidCredentialsError)) {
        setError(t("cloud.error.invalidCredentials"));
      } else {
        setError(t("cloud.error.unknown"));
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="CloudAccountModal-auth">
      <form
        className="auth-form"
        onSubmit={(e) => {
          e.preventDefault();
          handleLogin();
        }}
      >
        {error && <Alert level="attention">{error}</Alert>}

        <Input type="email" placeholder={t("cloud.email")} value={email} onValueChange={setEmail} />
        <Input type="password" placeholder={t("cloud.password")} value={password} onValueChange={setPassword} />

        <Button loading={isLoading} block>
          {t("cloud.login")}
        </Button>

        <p className="register-link">
          {t("cloud.noAccount")}{" "}
          <a href={`${ACCOUNT_URL}/register`} target="_blank" rel="noopener noreferrer">
            {t("cloud.createAccount")}
          </a>
        </p>
      </form>
    </div>
  );
};
