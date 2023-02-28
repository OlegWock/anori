import { createContext, useContext } from "react";
import { Folder, homeFolder } from "./user-data/types";

type FolderContentContextType = {
    activeFolder: Folder,
    isEditing: boolean,
    boxSize: number,
};

export const FolderContentContext = createContext<FolderContentContextType>({
    activeFolder: homeFolder,
    isEditing: false,
    boxSize: 180,
});

export const useParentFolder = () => {
    return useContext(FolderContentContext);
};