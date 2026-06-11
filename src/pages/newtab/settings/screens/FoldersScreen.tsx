import { ReorderGroup } from "@anori/components/lazy-components";
import { Button } from "@anori/design-system/components/Button/Button";
import { Heading } from "@anori/design-system/components/Heading/Heading";
import { builtinIcons } from "@anori/design-system/components/Icon/builtin-icons";
import { useFolders } from "@anori/utils/user-data/hooks";
import { homeFolder } from "@anori/utils/user-data/types";
import { m } from "motion/react";
import type { ComponentProps } from "react";
import { useTranslation } from "react-i18next";
import { css } from "styled-system/css";
import { FolderItem } from "../components/FolderItem";

const screen = css({ display: "flex", flexDirection: "column", gap: "4" });
const header = css({ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "4" });
const list = css({ display: "flex", flexDirection: "column", gap: "2" });

export const FoldersScreen = (props: ComponentProps<typeof m.div>) => {
  const { folders, setFolders, createFolder, updateFolder, removeFolder } = useFolders();
  const { t } = useTranslation();

  return (
    <m.div {...props} className={screen}>
      <div className={header}>
        <Heading level={2} size={1}>
          {t("settings.folders.title")}
        </Heading>
        <Button iconStart={builtinIcons.add} onClick={() => createFolder()}>
          {t("settings.folders.createNew")}
        </Button>
      </div>

      <div className={list}>
        <FolderItem folder={homeFolder} />
        <ReorderGroup axis="y" values={folders} onReorder={setFolders} as="div" className={list}>
          {folders.map((f) => (
            <FolderItem
              key={f.id}
              folder={f}
              editable
              onNameChange={(name) => updateFolder(f.id, { name })}
              onIconChange={(icon) => updateFolder(f.id, { icon })}
              onRemove={() => removeFolder(f.id)}
            />
          ))}
        </ReorderGroup>
      </div>
    </m.div>
  );
};
