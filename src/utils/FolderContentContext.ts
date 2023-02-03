import { createContext, useContext } from "react";
import { Folder, homeFolder } from "./user-data/types";
import { DEFAULT_BOX_SIZE } from "./grid";

type FolderContentContextType = {
    activeFolder: Folder,
    isEditing: boolean,
    boxSize: number,
};

export const FolderContentContext = createContext<FolderContentContextType>({
    activeFolder: homeFolder,
    isEditing: false,
    boxSize: DEFAULT_BOX_SIZE,
});

export const useParentFolder = () => {
    return useContext(FolderContentContext);
};