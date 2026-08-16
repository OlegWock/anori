import { Card } from "@anori/design-system/components/Card/Card";
import { builtinIcons } from "@anori/design-system/components/Icon/builtin-icons";
import { useTranslation } from "react-i18next";
import browser from "webextension-polyfill";
import { iconOf, list, Row } from "./PopupRow";

const openAnori = () => {
  browser.tabs.create({ url: browser.runtime.getURL("/pages/newtab/start.html"), active: true });
  window.close();
};

export const OpenAnoriRow = () => {
  const { t } = useTranslation();
  return (
    <Card gap="1" padding="2">
      <div className={list}>
        <Row icon={iconOf(builtinIcons.openOutline)} title={t("openAnori")} onClick={openAnori} />
      </div>
    </Card>
  );
};
