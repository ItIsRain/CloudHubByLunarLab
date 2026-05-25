"use client";

import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { FetchError } from "@/lib/fetch-json";

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000, // 5 minutes
        refetchOnWindowFocus: false,
        // Don't retry client errors (4xx) — only retry server errors (5xx)
        retry: (failureCount, error) => {
          if (error instanceof FetchError && error.status < 500) return false;
          return failureCount < 2;
        },
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined = undefined;

function getQueryClient(): QueryClient {
  if (typeof window === "undefined") {
    // Server: always make a new query client per request to avoid cross-
    // request state leaks.
    return makeQueryClient();
  }
  if (!browserQueryClient) browserQueryClient = makeQueryClient();
  return browserQueryClient;
}

/**
 * Lazy accessor for the browser-side query client. Use this from non-React
 * code (e.g. the auth store on logout) instead of importing a module-level
 * instance — eagerly creating one at module load can race with React 19/Next
 * 16 SSR and break the QueryClientProvider context wiring.
 */
export function getBrowserQueryClient(): QueryClient {
  return getQueryClient();
}

interface QueryProviderProps {
  children: React.ReactNode;
}

export function QueryProvider({ children }: QueryProviderProps) {
  // Stable per-tree client. On the server this creates a fresh client per
  // render pass; on the client it reuses the cached browser singleton.
  const [client] = React.useState(() => getQueryClient());
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
