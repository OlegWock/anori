export type StorageContent = {
    folders: Folder[],
};

export type ID = string;

export type Folder = {
    id: ID,
    name: string,
    icon: string,
};

export const homeFolder = {
    id: 'home',
    name: 'Home',
    icon: 'ion:home'
} satisfies Folder;