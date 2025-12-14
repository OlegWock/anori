import { isAppErrorOfType } from "@anori-app/api-client";
import { InvalidCredentialsError } from "@anori-app/api-types";
import { Alert } from "@anori/components/Alert";
import { Button } from "@anori/components/Button";
import { Input } from "@anori/components/Input";
import { Modal } from "@anori/components/Modal";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { login, logout } from "../auth";
import { ACCOUNT_URL } from "../consts";
import { useCloudAccount } from "../hooks";
import "./CloudAccountModal.scss";

type Props = {
  onClose: () => void;
};

export const CloudAccountModal = ({ onClose }: Props) => {
  const { t } = useTranslation();
  const { account, isConnected } = useCloudAccount();

  return (
    <Modal title={isConnected ? t("cloud.account") : t("cloud.login")} closable onClose={onClose}>
      {isConnected && account ? <ConnectedView account={account} /> : <AuthView />}
    </Modal>
  );
};

const ConnectedView = ({ account }: { account: NonNullable<ReturnType<typeof useCloudAccount>["account"]> }) => {
  const { t } = useTranslation();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await logout();
    setIsLoggingOut(false);
  };

  return (
    <div className="CloudAccountModal-connected">
      <div className="account-info">
        <div className="label">{t("cloud.connectedAs")}</div>
        <div className="email">{account.email}</div>
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
      <div className="auth-form">
        {error && <Alert level="attention">{error}</Alert>}

        <Input type="email" placeholder={t("cloud.email")} value={email} onValueChange={setEmail} />
        <Input type="password" placeholder={t("cloud.password")} value={password} onValueChange={setPassword} />

        <Button onClick={handleLogin} loading={isLoading} block>
          {t("cloud.login")}
        </Button>

        <p className="register-link">
          {t("cloud.noAccount")}{" "}
          <a href={`${ACCOUNT_URL}/register`} target="_blank" rel="noopener noreferrer">
            {t("cloud.createAccount")}
          </a>
        </p>
      </div>
    </div>
  );
};
