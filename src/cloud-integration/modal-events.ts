export const OPEN_CLOUD_ACCOUNT_EVENT = "anori:open-cloud-account";

export const openCloudAccountModal = () => {
  window.dispatchEvent(new CustomEvent(OPEN_CLOUD_ACCOUNT_EVENT));
};
