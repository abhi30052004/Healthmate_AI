import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";
import { SESSION_EXPIRED_EVENT } from "../context/AuthContext";

function notifyIfSessionExpired(error: unknown) {
  if ((error as { status?: number } | null)?.status === 401 && typeof window !== "undefined") {
    window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
  }
}

export const queryClient = new QueryClient({
  queryCache: new QueryCache({ onError: notifyIfSessionExpired }),
  mutationCache: new MutationCache({ onError: notifyIfSessionExpired }),
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30,
      gcTime: 1000 * 60 * 30,
      retry: (failureCount, error: any) => {
        // Do not retry auth / validation / not-found errors
        const status = error?.status;
        if (status === 401 || status === 403 || status === 404 || status === 422) return false;
        return failureCount < 2;
      },
      refetchOnWindowFocus: false,
    },
  },
});

/**
 * Profile-scoped cache keys. Every health-data key embeds the profile id so
 * data for one patient can never be served for another.
 */
export const profileQueryKeys = {
  all: ["profiles"] as const,
  profile: (profileId: string) => ["profile", profileId] as const,
  documents: (profileId: string) => ["documents", profileId] as const,
  trends: (profileId: string) => ["trends", profileId] as const,
  medicines: (profileId: string) => ["medicines", profileId] as const,
  appointments: (profileId: string) => ["appointments", profileId] as const,
  symptoms: (profileId: string) => ["symptoms", profileId] as const,
  visitPack: (profileId: string) => ["visit-pack", profileId] as const,
  auditLogs: (profileId: string) => ["audit-logs", profileId] as const,
};
