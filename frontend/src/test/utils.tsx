import React from "react";
import { render, type RenderOptions } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { I18nProvider } from "../i18n/i18nContext";
import type { FamilyProfile, User } from "../api/client";

/** A fresh, non-retrying query client per test so cache never leaks between tests. */
export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0, staleTime: 0 }, mutations: { retry: false } },
  });
}

export function renderWithProviders(
  ui: React.ReactElement,
  { route = "/", ...options }: { route?: string } & Omit<RenderOptions, "wrapper"> = {}
) {
  const client = createTestQueryClient();
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>
      <I18nProvider initialLanguage="en">
        <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>
      </I18nProvider>
    </QueryClientProvider>
  );
  return { client, ...render(ui, { wrapper: Wrapper, ...options }) };
}

export const testUser: User = {
  id: "user-1",
  email: "eva@example.com",
  name: "Eva Tester",
  is_active: true,
  created_at: "2026-01-01T00:00:00Z",
};

export const testProfile: FamilyProfile = {
  id: "prof-1",
  owner_id: "user-1",
  name: "Eva Tester",
  relationship: "self",
  is_primary: true,
  is_active: true,
  is_dependent: false,
  consent_status: "authorized",
  allergies_summary: "Penicillin",
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

export const secondProfile: FamilyProfile = {
  ...testProfile,
  id: "prof-2",
  name: "Aarav Tester",
  relationship: "child",
  is_primary: false,
  is_dependent: true,
  allergies_summary: null,
};
