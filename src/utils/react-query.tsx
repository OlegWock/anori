import { clearSession, isSessionError } from "@anori/cloud-integration/auth";
import { TRPCProvider } from "@anori/cloud-integration/components/TRPCProvider";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import type { ReactNode } from "react";
import browser from "webextension-polyfill";

const queryPersister = createAsyncStoragePersister({
  storage: window.localStorage,
});

const handleGlobalError = (error: unknown) => {
  if (isSessionError(error)) {
    clearSession();
  }
};

const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: handleGlobalError,
  }),
  mutationCache: new MutationCache({
    onError: handleGlobalError,
  }),
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        if (isSessionError(error)) return false;
        return failureCount < 2;
      },
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
      <TRPCProvider queryClient={queryClient}>{children}</TRPCProvider>
    </PersistQueryClientProvider>
  );
};
