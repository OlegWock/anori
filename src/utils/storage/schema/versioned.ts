import type { SchemaDefinition, SchemaVersion } from "./version";

export type MigrationContext<From extends SchemaDefinition, To extends SchemaDefinition> = {
  from: {
    schema: From;
    get: <K extends keyof From>(key: K) => Promise<unknown>;
  };
  to: {
    schema: To;
    set: <K extends keyof To>(key: K, value: unknown) => void;
  };
};

export type MigrationFn<From extends SchemaDefinition, To extends SchemaDefinition> = (
  ctx: MigrationContext<From, To>,
) => Promise<void>;

export type Migration<
  FromVersion extends number = number,
  ToVersion extends number = number,
  From extends SchemaDefinition = SchemaDefinition,
  To extends SchemaDefinition = SchemaDefinition,
> = {
  readonly fromVersion: FromVersion;
  readonly toVersion: ToVersion;
  readonly migrate: MigrationFn<From, To>;
};

export function createMigration<
  FromVersion extends number,
  ToVersion extends number,
  From extends SchemaDefinition,
  To extends SchemaDefinition,
>(
  from: SchemaVersion<FromVersion, From>,
  to: SchemaVersion<ToVersion, To>,
  fn: MigrationFn<From, To>,
): Migration<FromVersion, ToVersion, From, To> {
  return {
    fromVersion: from.version,
    toVersion: to.version,
    migrate: fn,
  };
}

export type VersionedSchema<
  Versions extends SchemaVersion[] = SchemaVersion[],
  Migrations extends Migration[] = Migration[],
> = {
  readonly versions: Versions;
  readonly migrations: Migrations;
  readonly currentVersion: number;
  readonly latestSchema: Versions[number];
};

export type DefineVersionedSchemaOptions<Versions extends SchemaVersion[], Migrations extends Migration[]> = {
  versions: Versions;
  migrations: Migrations;
};

export function defineVersionedSchema<Versions extends SchemaVersion[], Migrations extends Migration[]>(
  options: DefineVersionedSchemaOptions<Versions, Migrations>,
): VersionedSchema<Versions, Migrations> {
  if (options.versions.length === 0) {
    throw new Error("At least one schema version is required");
  }

  const sortedVersions = [...options.versions].sort((a, b) => a.version - b.version);
  const latestVersion = sortedVersions[sortedVersions.length - 1];

  return {
    versions: options.versions,
    migrations: options.migrations,
    currentVersion: latestVersion.version,
    latestSchema: latestVersion as VersionedSchema<Versions, Migrations>["latestSchema"],
  };
}

export function getMigrationPath(schema: VersionedSchema, fromVersion: number, toVersion: number): Migration[] {
  if (fromVersion >= toVersion) {
    return [];
  }

  const path: Migration[] = [];
  let current = fromVersion;

  while (current < toVersion) {
    const nextMigration = schema.migrations.find((m) => m.fromVersion === current);
    if (!nextMigration) {
      throw new Error(`No migration found from version ${current}`);
    }
    path.push(nextMigration);
    current = nextMigration.toVersion;
  }

  return path;
}
