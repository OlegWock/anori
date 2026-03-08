import { z } from "zod";
import { type MockBrowserStorageState, createMockBrowserStorage, resetMockBrowserStorage } from "./test-utils";

const browserState = vi.hoisted<MockBrowserStorageState>(() => ({ storage: {}, changeListeners: [] }));
let mockOpfsFiles: Record<string, Blob> = {};

vi.mock("webextension-polyfill", () => createMockBrowserStorage(browserState));

let pathCounter = 0;
vi.mock("../opfs", () => ({
  generateFilePath: vi.fn(() => `mock-path-${++pathCounter}`),
  writeFile: vi.fn(async (path: string, blob: Blob) => {
    mockOpfsFiles[path] = blob;
  }),
  readFile: vi.fn(async (path: string) => {
    return mockOpfsFiles[path] || null;
  }),
  deleteFile: vi.fn(async (path: string) => {
    if (path in mockOpfsFiles) {
      delete mockOpfsFiles[path];
      return true;
    }
    return false;
  }),
  listFiles: vi.fn(async () => Object.keys(mockOpfsFiles)),
  fileExists: vi.fn(async (path: string) => path in mockOpfsFiles),
}));

import { cell, defineSchemaVersion, defineVersionedSchema, file, fileCollection } from "../schema";
import { createStorage } from "../storage";

function createTestSchema() {
  const schemaV1 = defineSchemaVersion(1, {
    theme: cell({ key: "theme", schema: z.string(), tracked: true, includedInBackup: true, defaultValue: "Forest" }),
    profileImage: file({ key: "profileImage", tracked: true, includedInBackup: true }),
    images: fileCollection({ keyPrefix: "Image", tracked: true, includedInBackup: true }),
    imagesWithProps: fileCollection({
      keyPrefix: "ImageProp",
      tracked: true,
      includedInBackup: true,
      propertiesSchema: z.object({ name: z.string() }),
    }),
  });

  return defineVersionedSchema({
    versions: [schemaV1],
    migrations: [],
  });
}

describe("FilesStorage", () => {
  beforeEach(() => {
    resetMockBrowserStorage(browserState);
    mockOpfsFiles = {};
    pathCounter = 0;
  });

  async function createTestFilesStorage() {
    const schema = createTestSchema();
    const storage = createStorage({ schema });
    await storage.initialize();
    return { storage, filesStorage: storage.files, schema };
  }

  describe("file descriptor", () => {
    it("should create a file descriptor", () => {
      const imageFile = file({
        key: "profileImage",
        tracked: true,
        includedInBackup: true,
      });

      expect(imageFile.key).toBe("profileImage");
      expect(imageFile.tracked).toBe(true);
    });

    it("should create a file descriptor with properties schema", () => {
      const imageFile = file({
        key: "profileImage",
        tracked: true,
        includedInBackup: true,
        propertiesSchema: z.object({ width: z.number(), height: z.number() }),
      });

      expect(imageFile.key).toBe("profileImage");
      expect(imageFile.propertiesSchema).toBeDefined();
    });
  });

  describe("file collection descriptor", () => {
    it("should create a file collection descriptor", () => {
      const images = fileCollection({
        keyPrefix: "Image",
        tracked: true,
        includedInBackup: true,
      });

      expect(images.keyPrefix).toBe("Image");
      expect(images.tracked).toBe(true);
    });

    it("should create byId query", () => {
      const images = fileCollection({
        keyPrefix: "Image",
        tracked: true,
        includedInBackup: true,
      });

      const query = images.byId("abc123");
      expect(query.queryType).toBe("byId");
      expect(query.keyPrefix).toBe("Image");
      expect(query.id).toBe("abc123");
      expect(query.tracked).toBe(true);
    });

    it("should create all query", () => {
      const images = fileCollection({
        keyPrefix: "Image",
        tracked: true,
        includedInBackup: true,
      });

      const query = images.all();
      expect(query.queryType).toBe("all");
      expect(query.keyPrefix).toBe("Image");
      expect(query.tracked).toBe(true);
    });
  });

  describe("set and get", () => {
    it("should set and get a file", async () => {
      const { filesStorage, schema } = await createTestFilesStorage();

      const blob = new Blob(["test content"], { type: "text/plain" });
      await filesStorage.set(schema.latestSchema.definition.profileImage, blob);

      const result = await filesStorage.get(schema.latestSchema.definition.profileImage);
      expect(result).toBeDefined();
      expect(result?.blob).toBeDefined();
      expect(result?.meta.path).toBeDefined();
    });

    it("should set and get a file with properties", async () => {
      const { filesStorage } = await createTestFilesStorage();

      const imageFile = file({
        key: "profileImageWithProps",
        tracked: true,
        includedInBackup: true,
        propertiesSchema: z.object({ width: z.number(), height: z.number() }),
      });
      const blob = new Blob(["test content"], { type: "image/png" });
      const properties = { width: 100, height: 200 };

      await filesStorage.set(imageFile, blob, properties);

      const result = await filesStorage.get(imageFile);
      expect(result).toBeDefined();
      expect(result?.meta.properties).toEqual(properties);
    });

    it("should return undefined for non-existent file", async () => {
      const { filesStorage, schema } = await createTestFilesStorage();

      const result = await filesStorage.get(schema.latestSchema.definition.profileImage);

      expect(result).toBeUndefined();
    });
  });

  describe("getMeta", () => {
    it("should get file metadata without loading blob", async () => {
      const { filesStorage } = await createTestFilesStorage();

      const imageFile = file({
        key: "profileImageMeta",
        tracked: true,
        includedInBackup: true,
        propertiesSchema: z.object({ width: z.number() }),
      });
      const blob = new Blob(["test"]);

      await filesStorage.set(imageFile, blob, { width: 100 });

      const meta = filesStorage.getMeta(imageFile);
      expect(meta).toBeDefined();
      expect(meta?.properties).toEqual({ width: 100 });
      expect(meta?.path).toBeDefined();
    });
  });

  describe("getBlob", () => {
    it("should get blob by path", async () => {
      const { filesStorage, schema } = await createTestFilesStorage();

      const blob = new Blob(["test content"]);
      await filesStorage.set(schema.latestSchema.definition.profileImage, blob);

      const meta = filesStorage.getMeta(schema.latestSchema.definition.profileImage);
      expect(meta?.path).toBeDefined();
      if (!meta?.path) throw new Error("working around TS issues");
      const loadedBlob = await filesStorage.getBlob(meta.path);
      expect(loadedBlob).toBeDefined();
    });
  });

  describe("updateBlob", () => {
    it("should update blob for existing file", async () => {
      const { filesStorage } = await createTestFilesStorage();

      const imageFile = file({
        key: "updateBlobTest",
        tracked: true,
        includedInBackup: true,
        propertiesSchema: z.object({ width: z.number() }),
      });
      const blob1 = new Blob(["original"]);
      const blob2 = new Blob(["updated"]);

      await filesStorage.set(imageFile, blob1, { width: 100 });
      const originalPath = filesStorage.getMeta(imageFile)?.path;

      await filesStorage.updateBlob(imageFile, blob2);

      const meta = filesStorage.getMeta(imageFile);
      expect(meta?.path).toBe(originalPath);
      expect(meta?.properties).toEqual({ width: 100 });
    });

    it("should throw when file does not exist", async () => {
      const { filesStorage, schema } = await createTestFilesStorage();

      const blob = new Blob(["test"]);

      await expect(filesStorage.updateBlob(schema.latestSchema.definition.profileImage, blob)).rejects.toThrow(
        "File not found",
      );
    });
  });

  describe("updateProperties", () => {
    it("should update properties without changing blob", async () => {
      const { filesStorage } = await createTestFilesStorage();

      const imageFile = file({
        key: "updatePropsTest",
        tracked: true,
        includedInBackup: true,
        propertiesSchema: z.object({ width: z.number() }),
      });
      const blob = new Blob(["test"]);

      await filesStorage.set(imageFile, blob, { width: 100 });
      const originalPath = filesStorage.getMeta(imageFile)?.path;

      await filesStorage.updateProperties(imageFile, { width: 200 });

      const meta = filesStorage.getMeta(imageFile);
      expect(meta?.path).toBe(originalPath);
      expect(meta?.properties).toEqual({ width: 200 });
    });

    it("should throw when file does not exist", async () => {
      const { filesStorage } = await createTestFilesStorage();

      const imageFile = file({
        key: "nonExistentProps",
        tracked: true,
        includedInBackup: true,
        propertiesSchema: z.object({ width: z.number() }),
      });

      await expect(filesStorage.updateProperties(imageFile, { width: 100 })).rejects.toThrow("File not found");
    });
  });

  describe("delete", () => {
    it("should soft delete a file", async () => {
      const { filesStorage, schema } = await createTestFilesStorage();

      const blob = new Blob(["test"]);
      await filesStorage.set(schema.latestSchema.definition.profileImage, blob);
      expect(await filesStorage.get(schema.latestSchema.definition.profileImage)).toBeDefined();

      await filesStorage.delete(schema.latestSchema.definition.profileImage);
      expect(await filesStorage.get(schema.latestSchema.definition.profileImage)).toBeUndefined();
    });
  });

  describe("file collection operations", () => {
    it("should set and get collection items", async () => {
      const { filesStorage, schema } = await createTestFilesStorage();

      const images = schema.latestSchema.definition.images;
      const blob1 = new Blob(["image1"]);
      const blob2 = new Blob(["image2"]);

      await filesStorage.set(images.byId("a"), blob1);
      await filesStorage.set(images.byId("b"), blob2);

      const result1 = await filesStorage.get(images.byId("a"));
      const result2 = await filesStorage.get(images.byId("b"));

      expect(result1).toBeDefined();
      expect(result2).toBeDefined();
    });

    it("should get all collection items", async () => {
      const { filesStorage, schema } = await createTestFilesStorage();

      const images = schema.latestSchema.definition.images;
      const blob1 = new Blob(["image1"]);
      const blob2 = new Blob(["image2"]);

      await filesStorage.set(images.byId("a"), blob1);
      await filesStorage.set(images.byId("b"), blob2);

      const all = await filesStorage.get(images.all());

      expect(Object.keys(all)).toHaveLength(2);
      expect(all.a).toBeDefined();
      expect(all.b).toBeDefined();
    });

    it("should get all metadata for collection", async () => {
      const { filesStorage, schema } = await createTestFilesStorage();

      const images = schema.latestSchema.definition.imagesWithProps;

      await filesStorage.set(images.byId("a"), new Blob(["1"]), { name: "Image A" });
      await filesStorage.set(images.byId("b"), new Blob(["2"]), { name: "Image B" });

      const allMeta = filesStorage.getMeta(images.all());

      expect(Object.keys(allMeta)).toHaveLength(2);
      expect(allMeta.a.properties).toEqual({ name: "Image A" });
      expect(allMeta.b.properties).toEqual({ name: "Image B" });
    });

    it("should not include deleted items in collection.all", async () => {
      const { filesStorage, schema } = await createTestFilesStorage();

      const images = schema.latestSchema.definition.images;

      await filesStorage.set(images.byId("a"), new Blob(["1"]));
      await filesStorage.set(images.byId("b"), new Blob(["2"]));
      await filesStorage.delete(images.byId("a"));

      const all = await filesStorage.get(images.all());

      expect(Object.keys(all)).toHaveLength(1);
      expect(all.b).toBeDefined();
    });
  });

  describe("integration with main storage", () => {
    it("should store file metadata in main storage", async () => {
      const { filesStorage, schema } = await createTestFilesStorage();

      const blob = new Blob(["test"]);
      await filesStorage.set(schema.latestSchema.definition.profileImage, blob);

      // Verify metadata is accessible via filesStorage
      const meta = filesStorage.getMeta(schema.latestSchema.definition.profileImage);
      expect(meta).toBeDefined();
      expect(meta?.path).toBeDefined();
    });

    it("should add tracked files to outbox", async () => {
      const { storage, filesStorage, schema } = await createTestFilesStorage();

      const blob = new Blob(["test"]);
      await filesStorage.set(schema.latestSchema.definition.profileImage, blob);

      const outbox = storage.sync.getOutbox();
      expect(outbox.length).toBeGreaterThan(0);
      expect(outbox.some((e) => e.key === "profileImage")).toBe(true);
    });
  });
});
