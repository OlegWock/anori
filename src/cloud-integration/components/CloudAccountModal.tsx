import { getAppError, isAppErrorOfType } from "@anori-app/api-client";
import { InvalidCredentialsError } from "@anori-app/api-types";
import { Alert } from "@anori/components/Alert";
import { Button } from "@anori/components/Button";
import { Input } from "@anori/components/Input";
import { Modal } from "@anori/components/Modal";
import { anoriSchema } from "@anori/utils/storage";
import { useStorageValue } from "@anori/utils/storage-lib";
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
  const {
    data: profilesData,
    isLoading: isLoadingProfiles,
    error: profilesError,
    refetch: refetchProfiles,
  } = trpc.sync.listProfiles.useQuery();
  const createProfileMutation = trpc.sync.createProfile.useMutation();
  const [syncSettings] = useStorageValue(anoriSchema.cloudSyncSettings);
  const connectedProfileId = syncSettings?.profileId ?? null;

  const sortedProfiles = useMemo(() => {
    if (!profilesData) return [];
    return [...profilesData.profiles].sort((a, b) => a.name.localeCompare(b.name));
  }, [profilesData]);

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

  return (
    <div className="CloudAccountModal-connected">
      <div className="account-info">
        <div className="label">{t("cloud.connectedAs")}</div>
        <div className="email">{account.email}</div>
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
                return (
                  <div key={profile.id}>
                    <div className="profile-item">
                      <div className="profile-info">
                        <div className="profile-name">{profile.name}</div>
                        <div className="profile-meta">{new Date(profile.createdAt).toLocaleDateString()}</div>
                      </div>
                      {isConnected ? (
                        <Button onClick={handleDisconnect} loading={isDisconnecting} size="compact">
                          {t("cloud.disconnect")}
                        </Button>
                      ) : showConfirmation ? (
                        <Button onClick={() => setConfirmingProfileId(null)} size="compact" disabled={isConnecting}>
                          {t("cloud.cancel")}
                        </Button>
                      ) : (
                        <Button onClick={() => handleConnectClick(profile.id)} loading={isConnecting} size="compact">
                          {t("cloud.connect")}
                        </Button>
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
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      <Button onClick={handleLogout} loading={isLoggingOut}>
        {t("cloud.logout")}
      </Button>
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
