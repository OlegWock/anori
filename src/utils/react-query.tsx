import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import type { ReactNode } from "react";
import browser from "webextension-polyfill";

const queryPersister = createAsyncStoragePersister({
  storage: window.localStorage,
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      retryDelay: 0.2,
      gcTime: 1000 * 60 * 60 * 24, // 24 hours
    },
  },
});

export const QueryClientProvider = ({ children }: { children?: ReactNode }) => {
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister: queryPersister, buster: browser.runtime.getManifest().version }}
    >
      {children}
    </PersistQueryClientProvider>
  );
};
