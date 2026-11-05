import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes
      retry: (failureCount, error: any) => {
        // Do not retry 401/403 auth errors
        if (error?.status === 401 || error?.status === 403) return false;
        return failureCount < 2;
      },
      refetchOnWindowFocus: false,
    },
  },
});

// Profile-scoped cache key generator to guarantee patient data isolation in memory
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
