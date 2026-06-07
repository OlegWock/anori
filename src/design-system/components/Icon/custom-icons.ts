import { anoriSchema, getAnoriStorage } from "@anori/utils/storage";
import { useStorageFileCollection } from "@anori/utils/storage-lib/react";
import { useMemo } from "react";

export const CUSTOM_ICONS_SET_NAME = "custom";

export type CustomIcon = {
  name: string;
  objectUrl: string;
  isSvg: boolean;
};

const getMimeFromFileExtension = (extension: string): string => {
  if (extension === "png") return "image/png";
  if (extension === "svg") return "image/svg+xml";
  if (extension === "jpg" || extension === "jpeg") return "image/jpeg";
  if (extension === "webp") return "image/webp";
  return "";
};

export const getAllCustomIconNames = async (): Promise<string[]> => {
  const storage = await getAnoriStorage();
  const allMeta = storage.files.getMeta(anoriSchema.customIcons.all());
  return Object.keys(allMeta);
};

export const useCustomIcons = () => {
  const addNewCustomIcon = async (name: string, fileExtension: string, content: ArrayBuffer) => {
    const mimeType = getMimeFromFileExtension(fileExtension);
    const blob = new Blob([content], { type: mimeType });

    await setFile(name, blob, {
      mimeType: mimeType || undefined,
    });
  };

  const removeCustomIcon = async (name: string) => {
    await deleteFile(name);
  };

  const { items, deleteFile, setFile } = useStorageFileCollection(anoriSchema.customIcons.all());

  const customIcons = useMemo(() => {
    return Object.entries(items).map(([name, item]): CustomIcon => {
      return {
        name,
        objectUrl: item.objectUrl,
        isSvg: item.properties?.mimeType === "image/svg+xml",
      };
    });
  }, [items]);

  return { customIcons, addNewCustomIcon, removeCustomIcon };
};

export const useCustomIcon = (name: string) => {
  const { customIcons } = useCustomIcons();
  return customIcons.find((i) => i.name === name);
};

export const isValidCustomIconName = (name: string) => {
  return /^[\w\-_]+$/.test(name);
};
