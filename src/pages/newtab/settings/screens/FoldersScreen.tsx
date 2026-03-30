import { Button } from "@anori/components/Button";
import { Icon } from "@anori/components/icon/Icon";
import { builtinIcons } from "@anori/components/icon/builtin-icons";
import { ReorderGroup } from "@anori/components/lazy-components";
import { useFolders } from "@anori/utils/user-data/hooks";
import { homeFolder } from "@anori/utils/user-data/types";
import { m } from "framer-motion";
import type { ComponentProps } from "react";
import { useTranslation } from "react-i18next";
import { FolderItem } from "../components/FolderItem";
import "./FoldersScreen.scss";

export const FoldersScreen = (props: ComponentProps<typeof m.div>) => {
  const { folders, setFolders, createFolder, updateFolder, removeFolder } = useFolders();
  const { t } = useTranslation();

  return (
    <m.div {...props} className="FoldersScreen">
      <m.div>
        <FolderItem folder={homeFolder} />
        <ReorderGroup axis="y" values={folders} onReorder={setFolders} as="div">
          {folders.map((f, _index) => {
            return (
              <FolderItem
                key={f.id}
                folder={f}
                editable
                onNameChange={(name) => updateFolder(f.id, { name })}
                onIconChange={(icon) => updateFolder(f.id, { icon })}
                onRemove={() => removeFolder(f.id)}
              />
            );
          })}
        </ReorderGroup>
      </m.div>

      <Button className="add-folder-btn" onClick={() => createFolder()}>
        <Icon icon={builtinIcons.add} height={24} /> {t("settings.folders.createNew")}
      </Button>
    </m.div>
  );
};
