/**
 * How a key participates in cloud sync:
 * - "off" — local only, never synced.
 * - "profile" — synced, isolated per cloud profile.
 * - "user" — synced, shared across all of the user's profiles (account-global).
 */
export type SyncMode = "off" | "profile" | "user";

export type SyncScope = Exclude<SyncMode, "off">;
