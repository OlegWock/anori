import { z } from "zod";

export const StashSchema = z.object({
  id: z.string(),
  name: z.string(),
  icon: z.string().optional(),
  createdAt: z.number(),
});

export type Stash = z.infer<typeof StashSchema>;

export const StashLinkSchema = z.object({
  url: z.string(),
  title: z.string(),
});

export type StashLink = z.infer<typeof StashLinkSchema>;

const stashEntryBase = {
  id: z.string(),
  stashId: z.string(),
  addedAt: z.number(),
};

export const StashLinkEntrySchema = z.object({
  ...stashEntryBase,
  type: z.literal("link"),
  url: z.string(),
  title: z.string(),
});

export const StashGroupEntrySchema = z.object({
  ...stashEntryBase,
  type: z.literal("group"),
  name: z.string(),
  links: z.array(StashLinkSchema),
});

export const StashEntrySchema = z.discriminatedUnion("type", [StashLinkEntrySchema, StashGroupEntrySchema]);

export type StashEntry = z.infer<typeof StashEntrySchema>;
export type StashLinkEntry = z.infer<typeof StashLinkEntrySchema>;
export type StashGroupEntry = z.infer<typeof StashGroupEntrySchema>;
