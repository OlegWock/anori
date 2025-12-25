import type { QueryClient } from "@tanstack/react-query";
import { type ReactNode, useState } from "react";
import { createReactClient, trpc } from "../api-client";

type Props = {
  queryClient: QueryClient;
  children: ReactNode;
};

export const TRPCProvider = ({ queryClient, children }: Props) => {
  const [trpcClient] = useState(() => createReactClient());

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      {children}
    </trpc.Provider>
  );
};
