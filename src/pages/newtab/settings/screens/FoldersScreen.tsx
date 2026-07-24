import { ReorderableList } from "@anori/components/ReorderableList/ReorderableList";
import { Button } from "@anori/design-system/components/Button/Button";
import { Heading } from "@anori/design-system/components/Heading/Heading";
import { builtinIcons } from "@anori/design-system/components/Icon/builtin-icons";
import { useRunAfterNextRender } from "@anori/utils/hooks";
import { useFolders } from "@anori/utils/user-data/hooks";
import { homeFolder } from "@anori/utils/user-data/types";
import { AnimatePresence, m } from "motion/react";
import type { ComponentProps } from "react";
import { useTranslation } from "react-i18next";
import { css } from "styled-system/css";
import { FOLDER_NAME_INPUT_ATTR, FolderItem } from "../components/FolderItem";

const screen = css({ display: "flex", flexDirection: "column", gap: "4" });
const header = css({ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "4" });
const list = css({ display: "flex", flexDirection: "column", gap: "2" });

export const FoldersScreen = (props: ComponentProps<typeof m.div>) => {
  const { folders, setFolders, createFolder, updateFolder, removeFolder } = useFolders();
  const { t } = useTranslation();
  const runAfterRender = useRunAfterNextRender();

  const createAndFocusFolder = () => {
    const folderPromise = createFolder();
    runAfterRender(async () => {
      const folder = await folderPromise;
      const input = document.querySelector<HTMLInputElement>(`[${FOLDER_NAME_INPUT_ATTR}="${folder.id}"]`);
      input?.focus();
      input?.select();
    });
  };

  return (
    <m.div {...props} className={screen}>
      <div className={header}>
        <Heading level={2} size={1}>
          {t("settings.folders.title")}
        </Heading>
        <Button iconStart={builtinIcons.add} onClick={createAndFocusFolder}>
          {t("settings.folders.createNew")}
        </Button>
      </div>

      <div className={list}>
        <FolderItem folder={homeFolder} />
        <ReorderableList group="settings-folders" values={folders} onReorder={setFolders} className={list}>
          <AnimatePresence initial={false} mode="sync">
            {folders.map((f, index) => (
              <FolderItem
                key={f.id}
                folder={f}
                index={index}
                editable
                onNameChange={(name) => updateFolder(f.id, { name })}
                onIconChange={(icon) => updateFolder(f.id, { icon })}
                onRemove={() => removeFolder(f.id)}
              />
            ))}
          </AnimatePresence>
        </ReorderableList>
      </div>
    </m.div>
  );
};
