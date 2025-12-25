import { anoriSchema, getAnoriStorage } from "@anori/utils/storage";
import { atom, getDefaultStore, useAtom } from "jotai";
import { useEffect } from "react";

export const CUSTOM_ICONS_SET_NAME = "custom";

export type CustomIcon = {
  name: string;
  urlObject: string;
  svgContent: string | null;
};

const iconsCache: Record<string, CustomIcon> = {};
const iconsAtom = atom<CustomIcon[]>([]);

const getMimeFromFilename = (filename: string): string => {
  const name = filename.toLowerCase();
  if (name.endsWith(".svg")) return "image/svg+xml";
  if (name.endsWith(".png")) return "image/png";
  if (name.endsWith(".jpg") || name.endsWith(".jpeg")) return "image/jpeg";
  if (name.endsWith(".gif")) return "image/gif";
  if (name.endsWith(".webp")) return "image/webp";
  return "";
};

const stripExtension = (filename: string): string => {
  const lastDot = filename.lastIndexOf(".");
  if (lastDot === -1) return filename;
  return filename.slice(0, lastDot);
};

export const getAllCustomIconNames = async (): Promise<string[]> => {
  const storage = await getAnoriStorage();
  const allMeta = storage.files.getMeta(anoriSchema.customIcons.all());
  return Object.keys(allMeta);
};

const createCustomIconFromBlob = async (name: string, blob: Blob, mimeType?: string): Promise<CustomIcon> => {
  const isSvg = mimeType === "image/svg+xml";
  const urlObject = URL.createObjectURL(blob);
  const svgContent = isSvg ? await blob.text() : null;

  return {
    name,
    urlObject,
    svgContent,
  };
};

export const getAllCustomIcons = async (): Promise<CustomIcon[]> => {
  const storage = await getAnoriStorage();
  const allFiles = await storage.files.get(anoriSchema.customIcons.all());

  const icons: CustomIcon[] = await Promise.all(
    Object.entries(allFiles)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(async ([name, { blob, meta }]) => {
        if (iconsCache[name]) {
          return iconsCache[name];
        }
        const icon = await createCustomIconFromBlob(name, blob, meta.properties?.mimeType);
        iconsCache[name] = icon;
        return icon;
      }),
  );

  getDefaultStore().set(iconsAtom, icons);
  return icons;
};

export const deleteAllCustomIcons = async () => {
  const storage = await getAnoriStorage();
  const allMeta = storage.files.getMeta(anoriSchema.customIcons.all());

  for (const name of Object.keys(allMeta)) {
    await storage.files.delete(anoriSchema.customIcons.byId(name));
    if (iconsCache[name]) {
      URL.revokeObjectURL(iconsCache[name].urlObject);
      delete iconsCache[name];
    }
  }

  getDefaultStore().set(iconsAtom, []);
};

export const getCustomIcon = async (name: string): Promise<CustomIcon | null> => {
  if (iconsCache[name]) {
    return iconsCache[name];
  }

  const storage = await getAnoriStorage();
  const result = await storage.files.get(anoriSchema.customIcons.byId(name));

  if (!result) {
    return null;
  }

  const icon = await createCustomIconFromBlob(name, result.blob, result.meta.properties?.mimeType);
  iconsCache[name] = icon;
  return icon;
};

export const getCustomIconFromCache = (name: string): CustomIcon | null => {
  return iconsCache[name] || null;
};

export const useCustomIcon = (name: string) => {
  const { customIcons } = useCustomIcons();
  return customIcons.find((i) => i.name === name);
};

export const useCustomIcons = () => {
  const addNewCustomIcon = async (filename: string, content: ArrayBuffer, urlObj?: string) => {
    const storage = await getAnoriStorage();
    const mimeType = getMimeFromFilename(filename);
    const blob = new Blob([content], { type: mimeType });

    const name = stripExtension(filename);

    await storage.files.set(anoriSchema.customIcons.byId(name), blob, {
      mimeType: mimeType || undefined,
    });

    const isSvg = mimeType === "image/svg+xml";
    const svgContent = isSvg ? new TextDecoder().decode(content) : null;
    const urlObjFinal = urlObj || URL.createObjectURL(blob);

    const icon: CustomIcon = {
      name,
      urlObject: urlObjFinal,
      svgContent,
    };

    iconsCache[name] = icon;
    setIcons((p) => [...p.filter((i) => i.name !== name), icon].sort((a, b) => a.name.localeCompare(b.name)));
  };

  const removeCustomIcon = async (name: string) => {
    const storage = await getAnoriStorage();
    await storage.files.delete(anoriSchema.customIcons.byId(name));

    setIcons((p) => p.filter((icon) => icon.name !== name));
    if (iconsCache[name]) {
      URL.revokeObjectURL(iconsCache[name].urlObject);
      delete iconsCache[name];
    }
  };

  const [icons, setIcons] = useAtom(iconsAtom);

  useEffect(() => {
    getAllCustomIcons().then((icons) => setIcons(icons));
  }, []);

  return {
    customIcons: icons,
    addNewCustomIcon,
    removeCustomIcon,
  };
};

export const isValidCustomIconName = (name: string) => {
  return /^[\w\-_]+$/.test(name);
};
