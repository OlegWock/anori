import { vi } from "vitest";

export type ChangeListener = (changes: Record<string, { oldValue?: unknown; newValue?: unknown }>) => void;

export type MockBrowserStorageState = {
  storage: Record<string, unknown>;
  changeListeners: ChangeListener[];
};

export function createMockBrowserStorage(state: MockBrowserStorageState) {
  return {
    default: {
      storage: {
        local: {
          get: vi.fn(async (keys: string | string[] | null) => {
            if (keys === null) {
              return { ...state.storage };
            }
            if (typeof keys === "string") {
              return { [keys]: state.storage[keys] };
            }
            const result: Record<string, unknown> = {};
            for (const key of keys) {
              if (key in state.storage) {
                result[key] = state.storage[key];
              }
            }
            return result;
          }),
          set: vi.fn(async (items: Record<string, unknown>) => {
            const changes: Record<string, { oldValue?: unknown; newValue?: unknown }> = {};
            for (const [key, value] of Object.entries(items)) {
              changes[key] = { oldValue: state.storage[key], newValue: value };
              state.storage[key] = value;
            }
            for (const listener of state.changeListeners) {
              listener(changes);
            }
          }),
          remove: vi.fn(async (keys: string | string[]) => {
            const keyList = typeof keys === "string" ? [keys] : keys;
            for (const key of keyList) {
              delete state.storage[key];
            }
          }),
          onChanged: {
            addListener: vi.fn((callback: ChangeListener) => {
              state.changeListeners.push(callback);
            }),
            removeListener: vi.fn((callback: ChangeListener) => {
              const index = state.changeListeners.indexOf(callback);
              if (index >= 0) {
                state.changeListeners.splice(index, 1);
              }
            }),
          },
        },
      },
    },
  };
}

export function resetMockBrowserStorage(state: MockBrowserStorageState): void {
  for (const key of Object.keys(state.storage)) {
    delete state.storage[key];
  }
  state.changeListeners.length = 0;
}
