import { CUSTOM_ICONS_SET_NAME, useCustomIcons } from "@anori/components/icon/custom-icons";
import type { IconifyInfo } from "@iconify/types";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

export const ICONIFY_API_BASE = `https://api.iconify.design`;

type IconSetInfo = {
  id: string;
  name: string;
};

const fetchRemoteIconSets = async (): Promise<IconSetInfo[]> => {
  const response = await fetch(`${ICONIFY_API_BASE}/collections`);
  if (!response.ok) throw new Error(`HTTP response error: ${response.status}`);
  const json = await response.json();
  return Object.entries(json as Record<string, IconifyInfo>)
    .filter(([_, set]) => !set.hidden)
    .map(([id, set]) => ({
      id,
      name: set.name,
    }));
};

export const useIconSets = () => {
  const { t } = useTranslation();
  const { data, isLoading, isError } = useQuery({ queryKey: ["icon", "sets"], queryFn: fetchRemoteIconSets });
  const iconSetIds = useMemo(() => [CUSTOM_ICONS_SET_NAME, ...(data ?? []).map((s) => s.id)], [data]);
  const prettyNames = useMemo(
    () => Object.fromEntries([[CUSTOM_ICONS_SET_NAME, t("customIcons")], ...(data ?? []).map((s) => [s.id, s.name])]),
    [data, t],
  );
  return { iconSetIds, prettyNames, isLoading, isError };
};

type GetRemoteIconsOptions = {
  set?: string;
  searchQuery?: string;
};

interface IconifyCollectionEndpointResponse {
  prefix: string;
  uncategorized?: string[];
  categories?: Record<string, string[]>;
}

const getRemoteIcons = async ({ set, searchQuery }: GetRemoteIconsOptions): Promise<string[]> => {
  if (searchQuery) {
    const params = new URLSearchParams({ query: searchQuery, limit: "100" });
    if (set) {
      params.set("prefix", set);
    }

    const response = await fetch(`${ICONIFY_API_BASE}/search?${params}`);
    if (!response.ok) throw new Error(`HTTP response error: ${response.status}`);
    const json = await response.json();
    return (json as { icons: string[] }).icons;
  }

  if (set) {
    const params = new URLSearchParams({ prefix: set });

    const response = await fetch(`${ICONIFY_API_BASE}/collection?${params}`);
    if (!response.ok) throw new Error(`HTTP response error: ${response.status}`);
    const json = (await response.json()) as IconifyCollectionEndpointResponse;
    const icons: string[] = [];
    if (json.uncategorized) {
      icons.push(...json.uncategorized);
    }
    if (json.categories) {
      Object.values(json.categories).forEach((categoryIcons) => icons.push(...categoryIcons));
    }
    return [...new Set(icons)].map((i) => `${json.prefix}:${i}`);
  }

  throw new Error("either set or searchQuery should be set when calling getRemoteIcons");
};

export const useIcons = ({ set, searchQuery }: GetRemoteIconsOptions) => {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["icon", "list", set, searchQuery],
    queryFn: () => {
      if (!set && !searchQuery) return [];
      return getRemoteIcons({ set, searchQuery });
    },
  });
  const { customIcons } = useCustomIcons();
  const allIcons = useMemo(() => {
    const matchingCustomIcons =
      !!set && set !== CUSTOM_ICONS_SET_NAME
        ? []
        : customIcons.filter((i) => (searchQuery ? i.name.toLowerCase().includes(searchQuery.toLowerCase()) : true));
    return [...matchingCustomIcons.map((i) => `${CUSTOM_ICONS_SET_NAME}:${i.name}`), ...(data ?? [])];
  }, [customIcons, data, set, searchQuery]);

  return { icons: allIcons, isLoading, isError };
};
