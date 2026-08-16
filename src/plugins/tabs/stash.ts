import { guid } from "@anori/utils/misc";
import {
  type AnoriStorage,
  anoriSchema,
  getAnoriStorage,
  type Stash,
  type StashEntry,
  type StashLink,
} from "@anori/utils/storage";
import { DEFAULT_STASH_ID } from "./consts";

export async function ensureDefaultStash(storage?: AnoriStorage): Promise<void> {
  const s = storage ?? (await getAnoriStorage());
  const existing = s.get(anoriSchema.stashes.stash.byId(DEFAULT_STASH_ID));
  if (existing) return;
  const inbox: Stash = {
    id: DEFAULT_STASH_ID,
    name: "Inbox",
    createdAt: Date.now(),
  };
  await s.set(anoriSchema.stashes.stash.byId(DEFAULT_STASH_ID), inbox);
}

export async function addLinks(stashId: string, links: StashLink[]): Promise<void> {
  const storage = await getAnoriStorage();
  const now = Date.now();
  for (let i = 0; i < links.length; i++) {
    const id = guid();
    const entry: StashEntry = {
      id,
      stashId,
      // Offset batch timestamps so newest-first sorting preserves captured link order.
      addedAt: now + i,
      type: "link",
      url: links[i].url,
      title: links[i].title,
    };
    await storage.set(anoriSchema.stashEntries.entry.byId(id), entry);
  }
}

export async function addGroup(stashId: string, name: string, links: StashLink[]): Promise<string> {
  const storage = await getAnoriStorage();
  const id = guid();
  const entry: StashEntry = {
    id,
    stashId,
    addedAt: Date.now(),
    type: "group",
    name,
    links,
  };
  await storage.set(anoriSchema.stashEntries.entry.byId(id), entry);
  return id;
}

export async function renameGroup(entryId: string, name: string): Promise<void> {
  const storage = await getAnoriStorage();
  const entry = storage.get(anoriSchema.stashEntries.entry.byId(entryId));
  if (entry?.type !== "group") return;
  await storage.set(anoriSchema.stashEntries.entry.byId(entryId), { ...entry, name });
}

export async function removeEntry(entryId: string): Promise<void> {
  const storage = await getAnoriStorage();
  await storage.delete(anoriSchema.stashEntries.entry.byId(entryId));
}

export async function removeGroupLink(entryId: string, linkIndex: number): Promise<void> {
  const storage = await getAnoriStorage();
  const entry = storage.get(anoriSchema.stashEntries.entry.byId(entryId));
  if (entry?.type !== "group") return;
  const links = entry.links.filter((_, i) => i !== linkIndex);
  if (links.length === 0) {
    await storage.delete(anoriSchema.stashEntries.entry.byId(entryId));
    return;
  }
  await storage.set(anoriSchema.stashEntries.entry.byId(entryId), { ...entry, links });
}
