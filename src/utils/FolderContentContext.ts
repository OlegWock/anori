import { createContext, useContext } from "react";
import { Folder, homeFolder } from "./user-data/types";

type FolderContentContextType = {
    activeFolder: Folder,
    isEditing: boolean,
};

export const FolderContentContext = createContext<FolderContentContextType>({
    activeFolder: homeFolder,
    isEditing: false,
});

export const useParentFolder = () => {
    return useContext(FolderContentContext);
};