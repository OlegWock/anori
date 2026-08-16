import { CloudAccountContent } from "@anori/cloud-integration/components/CloudAccountModal";
import { Heading } from "@anori/design-system/components/Heading/Heading";
import { m } from "motion/react";
import type { ComponentProps } from "react";
import { useTranslation } from "react-i18next";
import { css } from "styled-system/css";

const screen = css({ display: "flex", flexDirection: "column", gap: "5" });

export const AnoriPlusScreen = (props: ComponentProps<typeof m.div>) => {
  const { t } = useTranslation();
  return (
    <m.div {...props} className={screen}>
      <Heading level={2} size={1}>
        {t("cloud.account")}
      </Heading>
      <CloudAccountContent />
    </m.div>
  );
};
