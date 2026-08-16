export type SyncMode = "off" | "profile" | "user";

export type SyncScope = Exclude<SyncMode, "off">;
