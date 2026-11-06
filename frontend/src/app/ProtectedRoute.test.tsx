import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "../context/AuthContext";
import { ProtectedRoute, PublicOnlyRoute } from "./ProtectedRoute";
import { authService, tokenStorage } from "../services/authService";

function App({ at }: { at: string }) {
  return (
    <AuthProvider>
      <MemoryRouter initialEntries={[at]}>
        <Routes>
          <Route path="/login" element={<PublicOnlyRoute><p>login screen</p></PublicOnlyRoute>} />
          <Route path="/app/*" element={<ProtectedRoute><p>private workspace</p></ProtectedRoute>} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>
  );
}

beforeEach(() => {
  tokenStorage.clear();
  vi.restoreAllMocks();
});

describe("route guards", () => {
  it("sends anonymous visitors to /login and never renders the workspace", async () => {
    render(<App at="/app/records" />);
    expect(await screen.findByText("login screen")).toBeDefined();
    expect(screen.queryByText("private workspace")).toBeNull();
  });

  it("lets a verified session through", async () => {
    tokenStorage.set("tok");
    vi.spyOn(authService, "getMe").mockResolvedValue({ id: "u", name: "E", email: "e@example.com", is_active: true, created_at: "" });
    render(<App at="/app/records" />);
    expect(await screen.findByText("private workspace")).toBeDefined();
  });

  it("an invalid stored token is cleared and treated as signed out", async () => {
    tokenStorage.set("stale");
    vi.spyOn(authService, "getMe").mockRejectedValue(Object.assign(new Error("401"), { status: 401, name: "ApiError" }));
    render(<App at="/app/records" />);
    await waitFor(() => expect(screen.getByText("login screen")).toBeDefined());
    expect(tokenStorage.get()).toBeNull();
  });

  it("signed-in users are bounced away from /login", async () => {
    tokenStorage.set("tok");
    vi.spyOn(authService, "getMe").mockResolvedValue({ id: "u", name: "E", email: "e@example.com", is_active: true, created_at: "" });
    render(
      <AuthProvider>
        <MemoryRouter initialEntries={["/login"]}>
          <Routes>
            <Route path="/login" element={<PublicOnlyRoute><p>login screen</p></PublicOnlyRoute>} />
            <Route path="/app/dashboard" element={<p>dashboard</p>} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    );
    expect(await screen.findByText("dashboard")).toBeDefined();
  });
});
