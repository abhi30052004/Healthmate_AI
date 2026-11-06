import React from "react";
import { render, screen, act, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { AuthProvider, SESSION_EXPIRED_EVENT, useAuth } from "./AuthContext";
import { authService, tokenStorage, ApiError } from "../services/authService";
import { queryClient } from "../app/queryClient";

const user = { id: "u1", name: "Eva", email: "eva@example.com", is_active: true, created_at: "" };

function Probe() {
  const a = useAuth();
  return (
    <div>
      <span data-testid="state">{a.isInitializing ? "init" : a.user ? `in:${a.user.email}` : "out"}</span>
      <span data-testid="err">{a.sessionError ?? ""}</span>
      <button onClick={() => a.setSession({ access_token: "tok", token_type: "bearer", expires_in: 900, user })}>adopt</button>
      <button onClick={a.logout}>logout</button>
    </div>
  );
}

beforeEach(() => {
  tokenStorage.clear();
  vi.restoreAllMocks();
});

describe("AuthProvider", () => {
  it("starts signed out with no stored token", async () => {
    render(<AuthProvider><Probe /></AuthProvider>);
    expect(screen.getByTestId("state").textContent).toBe("out");
  });

  it("restores a stored session by verifying the token with the server", async () => {
    tokenStorage.set("stored");
    vi.spyOn(authService, "getMe").mockResolvedValue(user);
    render(<AuthProvider><Probe /></AuthProvider>);
    expect(screen.getByTestId("state").textContent).toBe("init");
    await waitFor(() => expect(screen.getByTestId("state").textContent).toBe("in:eva@example.com"));
  });

  it("drops an expired stored token and explains why", async () => {
    tokenStorage.set("old");
    vi.spyOn(authService, "getMe").mockRejectedValue(new ApiError(401, "expired"));
    render(<AuthProvider><Probe /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId("state").textContent).toBe("out"));
    expect(screen.getByTestId("err").textContent).toMatch(/session has expired/i);
    expect(tokenStorage.get()).toBeNull();
  });

  it("setSession stores the token; logout clears it", async () => {
    vi.spyOn(authService, "getMe").mockResolvedValue(user);
    render(<AuthProvider><Probe /></AuthProvider>);
    await act(async () => screen.getByText("adopt").click());
    await waitFor(() => expect(screen.getByTestId("state").textContent).toBe("in:eva@example.com"));
    expect(tokenStorage.get()).toBe("tok");
    await act(async () => screen.getByText("logout").click());
    expect(screen.getByTestId("state").textContent).toBe("out");
    expect(tokenStorage.get()).toBeNull();
  });

  it("any API 401 (broadcast by the query layer) ends the session", async () => {
    vi.spyOn(authService, "getMe").mockResolvedValue(user);
    render(<AuthProvider><Probe /></AuthProvider>);
    await act(async () => screen.getByText("adopt").click());
    await waitFor(() => expect(screen.getByTestId("state").textContent).toContain("in:"));
    act(() => {
      window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
    });
    expect(screen.getByTestId("state").textContent).toBe("out");
    expect(screen.getByTestId("err").textContent).toMatch(/session has expired/i);
  });

  it("the shared query client turns a 401 from a query into that event", async () => {
    const handler = vi.fn();
    window.addEventListener(SESSION_EXPIRED_EVENT, handler);
    await queryClient.fetchQuery({ queryKey: ["x"], queryFn: () => Promise.reject(new ApiError(401, "no")), retry: false }).catch(() => {});
    window.removeEventListener(SESSION_EXPIRED_EVENT, handler);
    expect(handler).toHaveBeenCalledTimes(1);
  });
});
