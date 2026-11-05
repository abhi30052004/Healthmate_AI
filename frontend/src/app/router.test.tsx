import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { RouterProvider } from "react-router-dom";
import { createTestRouter } from "./router";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./queryClient";
import { I18nProvider } from "../i18n/i18nContext";

function renderWithRouter(initialPath = "/") {
  const testRouter = createTestRouter(initialPath);
  return render(
    <QueryClientProvider client={queryClient}>
      <I18nProvider initialLanguage="en">
        <RouterProvider router={testRouter} />
      </I18nProvider>
    </QueryClientProvider>
  );
}

describe("React Router Architecture", () => {
  it("renders the landing page route by default", async () => {
    renderWithRouter("/");

    expect(screen.getByText(/One place for your family’s health records/i)).toBeDefined();
    expect(screen.getByText("Private by Default")).toBeDefined();
  });

  it("renders the login page when navigating to /login", async () => {
    renderWithRouter("/login");

    expect(screen.getByText(/Welcome back/i)).toBeDefined();
    expect(screen.getByRole("button", { name: /Sign In to Workspace/i })).toBeDefined();
  });

  it("renders the register page when navigating to /register", async () => {
    renderWithRouter("/register");

    expect(screen.getByText(/Create your free health vault/i)).toBeDefined();
    expect(screen.getByText("1. Account")).toBeDefined();
  });

  it("renders public doctor portal when navigating to /s/:token", async () => {
    renderWithRouter("/s/SH-TEST-QR-99");

    expect(screen.getByText(/HealthMate AI Clinician Portal/i)).toBeDefined();
    expect(screen.getByText(/Token: SH-TEST-QR-99/i)).toBeDefined();
  });

  it("renders custom 404 page when route is not found", async () => {
    renderWithRouter("/non-existent-page-url");

    expect(screen.getByText("404 • Page Not Found")).toBeDefined();
    expect(screen.getByText("We couldn't find that health record")).toBeDefined();
    expect(screen.getByRole("button", { name: /Go to Dashboard/i })).toBeDefined();
  });
});
