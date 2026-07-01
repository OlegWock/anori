import { EmptyState } from "@anori/design-system/components/EmptyState/EmptyState";
import { builtinIcons } from "@anori/design-system/components/Icon/builtin-icons";
import { useTranslation } from "react-i18next";
import { css } from "styled-system/css";

const fill = css({ flexGrow: 1 });

export const AnkiUnreachable = () => {
  const { t } = useTranslation();
  return (
    <EmptyState
      className={fill}
      icon={builtinIcons.disconnected}
      title={t("anki-plugin.errorTitle")}
      description={t("anki-plugin.error")}
    />
  );
};
