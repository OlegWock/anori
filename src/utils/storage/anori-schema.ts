import { z } from "zod";
import { cell, collection, defineSchemaVersion, defineVersionedSchema, entity } from "./schema";

const FolderSchema = z.object({
  id: z.string(),
  name: z.string(),
  icon: z.string(),
});

export type Folder = z.infer<typeof FolderSchema>;

const WidgetInFolderSchema = z.object({
  pluginId: z.string(),
  widgetId: z.string(),
  instanceId: z.string(),
  configuration: z.record(z.string(), z.unknown()),
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
});

const FolderDetailsSchema = z.object({
  widgets: z.array(WidgetInFolderSchema),
});

export type FolderDetails = z.infer<typeof FolderDetailsSchema>;

export const schemaV1 = defineSchemaVersion(1, {
  folders: cell({
    key: "folders",
    schema: z.array(FolderSchema),
    defaultValue: [],
    tracked: true,
  }),
  folderDetails: collection({
    keyPrefix: "Folder",
    entities: {
      folder: entity({
        brand: "FolderDetails",
        schema: FolderDetailsSchema,
      }),
    },
    tracked: true,
  }),
  newTabTitle: cell({
    key: "newTabTitle",
    schema: z.string(),
    defaultValue: "Anori",
    tracked: true,
  }),
});

export const anoriSchema = defineVersionedSchema({
  versions: [schemaV1],
  migrations: [],
});

export type AnoriSchemaV1 = typeof schemaV1.definition;
