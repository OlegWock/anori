import type { StashLink } from "@anori/utils/storage";
import { z } from "zod";

export const stashWidgetConfigSchema = z.object({
  stashId: z.string().optional(),
});

export type StashWidgetConfig = z.infer<typeof stashWidgetConfigSchema>;

export type TabsMessageHandlers = {
  stashLinks: {
    args: { stashId: string; links: StashLink[] };
    result: void;
  };
  stashGroup: {
    args: { stashId: string; name: string; links: StashLink[] };
    result: { entryId: string };
  };
  renameGroup: {
    args: { entryId: string; name: string };
    result: void;
  };
  removeEntry: {
    args: { entryId: string };
    result: void;
  };
  removeGroupLink: {
    args: { entryId: string; linkIndex: number };
    result: void;
  };
};
