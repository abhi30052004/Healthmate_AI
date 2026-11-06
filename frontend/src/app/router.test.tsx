import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { RouterProvider } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { createTestRouter } from "./router";
import { queryClient } from "./queryClient";
import { I18nProvider } from "../i18n/i18nContext";
import { AuthProvider } from "../context/AuthContext";
import { tokenStorage } from "../services/authService";
import * as api from "../api/client";

vi.mock("../api/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../api/client")>();
  return { ...actual, getSharedHealthPortalView: vi.fn(), listFamilyProfiles: vi.fn() };
});

function renderWithRouter(initialPath = "/") {
  const testRouter = createTestRouter(initialPath);
  const utils = render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <I18nProvider initialLanguage="en">
          <RouterProvider router={testRouter} />
        </I18nProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
  return { router: testRouter, ...utils };
}

beforeEach(() => {
  tokenStorage.clear();
  queryClient.clear();
  vi.restoreAllMocks();
});

describe("React Router Architecture", () => {
  it("renders the landing page route by default", async () => {
    renderWithRouter("/");
    expect(screen.getByRole("heading", { level: 1 }).textContent).toMatch(/Your family’s health, finally in one place/i);
    expect(screen.getByText("Private by default")).toBeDefined();
  });

  it("renders the login page when navigating to /login", async () => {
    renderWithRouter("/login");
    expect(await screen.findByText(/Welcome back/i)).toBeDefined();
    expect(screen.getByRole("button", { name: /Sign In to Workspace/i })).toBeDefined();
  });

  it("renders the register page when navigating to /register", async () => {
    renderWithRouter("/register");
    expect(await screen.findByText(/Create your free health vault/i)).toBeDefined();
    expect(screen.getByText("1. Account")).toBeDefined();
  });

  it("the doctor portal route is public and fails closed on a bad token", async () => {
    vi.mocked(api.getSharedHealthPortalView).mockRejectedValue(new api.ApiError(404, "not found"));
    renderWithRouter("/s/not-a-real-token");
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toMatch(/isn't available/i);
    expect(api.getSharedHealthPortalView).toHaveBeenCalledWith("not-a-real-token");
    expect(screen.queryByText(/not-a-real-token/)).toBeNull(); // the secret is never echoed back
  });

  it("renders custom 404 page when route is not found", async () => {
    renderWithRouter("/non-existent-page-url");
    expect(screen.getByText("404 • Page Not Found")).toBeDefined();
    expect(screen.getByText("We couldn't find that health record")).toBeDefined();
  });
});
