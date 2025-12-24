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

export const getAllCustomIconNames = async (): Promise<string[]> => {
  const storage = await getAnoriStorage();
  const allMeta = storage.files.getMeta(anoriSchema.latestSchema.definition.customIcons.all());
  return Object.keys(allMeta);
};

const createCustomIconFromBlob = async (name: string, blob: Blob): Promise<CustomIcon> => {
  const isSvg = name.toLowerCase().endsWith(".svg");
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
  const allFiles = await storage.files.get(anoriSchema.latestSchema.definition.customIcons.all());

  const icons: CustomIcon[] = await Promise.all(
    Object.entries(allFiles)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(async ([name, { blob }]) => {
        if (iconsCache[name]) {
          return iconsCache[name];
        }
        const icon = await createCustomIconFromBlob(name, blob);
        iconsCache[name] = icon;
        return icon;
      }),
  );

  getDefaultStore().set(iconsAtom, icons);
  return icons;
};

export const deleteAllCustomIcons = async () => {
  const storage = await getAnoriStorage();
  const allMeta = storage.files.getMeta(anoriSchema.latestSchema.definition.customIcons.all());

  for (const name of Object.keys(allMeta)) {
    await storage.files.delete(anoriSchema.latestSchema.definition.customIcons.byId(name));
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
  const result = await storage.files.get(anoriSchema.latestSchema.definition.customIcons.byId(name));

  if (!result) {
    return null;
  }

  const icon = await createCustomIconFromBlob(name, result.blob);
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
    const blob = new Blob([content], { type: getMimeFromFilename(filename) });

    await storage.files.set(anoriSchema.latestSchema.definition.customIcons.byId(filename), blob, {
      name: filename,
      mimeType: blob.type || undefined,
    });

    const isSvg = filename.toLowerCase().endsWith(".svg");
    const svgContent = isSvg ? new TextDecoder().decode(content) : null;
    const urlObjFinal = urlObj || URL.createObjectURL(blob);

    const icon: CustomIcon = {
      name: filename,
      urlObject: urlObjFinal,
      svgContent,
    };

    iconsCache[filename] = icon;
    setIcons((p) => [...p.filter((i) => i.name !== filename), icon].sort((a, b) => a.name.localeCompare(b.name)));
  };

  const removeCustomIcon = async (filename: string) => {
    const storage = await getAnoriStorage();
    await storage.files.delete(anoriSchema.latestSchema.definition.customIcons.byId(filename));

    setIcons((p) => p.filter((icon) => icon.name !== filename));
    if (iconsCache[filename]) {
      URL.revokeObjectURL(iconsCache[filename].urlObject);
      delete iconsCache[filename];
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
