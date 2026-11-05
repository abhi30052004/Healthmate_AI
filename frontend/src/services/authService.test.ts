import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ApiError,
  authService,
  getApiBaseUrl,
  parseApiError,
  tokenStorage,
} from "./authService";

describe("authService", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    sessionStorage.clear();
  });

  it("retrieves base URL from Vite environment or default", () => {
    const url = getApiBaseUrl();
    expect(url).toBe("http://127.0.0.1:8000");
  });

  describe("tokenStorage", () => {
    it("stores, retrieves, and clears token in sessionStorage", () => {
      expect(tokenStorage.get()).toBeNull();

      tokenStorage.set("jwt-test-token-123");
      expect(tokenStorage.get()).toBe("jwt-test-token-123");

      tokenStorage.clear();
      expect(tokenStorage.get()).toBeNull();
    });
  });

  describe("parseApiError", () => {
    it("extracts string detail message", async () => {
      const mockRes = new Response(JSON.stringify({ detail: "User already registered" }), {
        status: 409,
        headers: { "Content-Type": "application/json" },
      });
      const msg = await parseApiError(mockRes);
      expect(msg).toBe("User already registered");
    });

    it("extracts structured Pydantic 422 error details with fields", async () => {
      const mockRes = new Response(
        JSON.stringify({
          detail: [
            { loc: ["body", "email"], msg: "value is not a valid email address" },
            { loc: ["body", "password"], msg: "Password must be at least 8 characters long" },
          ],
        }),
        { status: 422, headers: { "Content-Type": "application/json" } }
      );
      const msg = await parseApiError(mockRes);
      expect(msg).toContain("email: value is not a valid email address");
      expect(msg).toContain("password: Password must be at least 8 characters long");
    });

    it("falls back to generic status code if body is unparseable", async () => {
      const mockRes = new Response("Internal Server Error", { status: 500 });
      const msg = await parseApiError(mockRes);
      expect(msg).toBe("Request failed with status 500");
    });
  });

  describe("authService API methods", () => {
    it("registers user successfully", async () => {
      const mockUser = {
        id: "usr-123",
        name: "Dr. Gregory House",
        email: "house@diagnostics.org",
        is_active: true,
        created_at: "2026-10-28T09:00:00Z",
      };

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          status: 201,
          json: async () => mockUser,
        })
      );

      const res = await authService.register({
        name: "Dr. Gregory House",
        email: "house@diagnostics.org",
        password: "SuperSecret123!",
      });

      expect(res.id).toBe("usr-123");
      expect(res.email).toBe("house@diagnostics.org");
    });

    it("throws ApiError when registration email conflict occurs (409)", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: false,
          status: 409,
          json: async () => ({ detail: "A user with this email already exists" }),
        })
      );

      await expect(
        authService.register({
          name: "Dr. Gregory House",
          email: "existing@hospital.org",
          password: "SuperSecret123!",
        })
      ).rejects.toThrow("A user with this email already exists");
    });

    it("authenticates and returns access token and user summary", async () => {
      const mockLoginResponse = {
        access_token: "jwt-token-abc",
        token_type: "bearer",
        expires_in: 900,
        user: {
          id: "usr-123",
          name: "Dr. Gregory House",
          email: "house@diagnostics.org",
        },
      };

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => mockLoginResponse,
        })
      );

      const res = await authService.login({
        email: "house@diagnostics.org",
        password: "SuperSecret123!",
      });

      expect(res.access_token).toBe("jwt-token-abc");
      expect(res.expires_in).toBe(900);
      expect(res.user.email).toBe("house@diagnostics.org");
    });

    it("throws ApiError when login credentials are invalid (401)", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: false,
          status: 401,
          json: async () => ({ detail: "Incorrect email or password" }),
        })
      );

      await expect(
        authService.login({
          email: "house@diagnostics.org",
          password: "WrongPassword!",
        })
      ).rejects.toThrow("Incorrect email or password");
    });

    it("fetches current user profile with Authorization Bearer header via getMe", async () => {
      const mockUser = {
        id: "usr-123",
        name: "Dr. Gregory House",
        email: "house@diagnostics.org",
        is_active: true,
        created_at: "2026-10-28T09:00:00Z",
      };

      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockUser,
      });
      vi.stubGlobal("fetch", fetchMock);

      const user = await authService.getMe("valid-bearer-token");
      expect(user.id).toBe("usr-123");

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/api/auth/me"),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "Bearer valid-bearer-token",
          }),
        })
      );
    });

    it("handles connection failure when server is unreachable", async () => {
      vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));

      await expect(authService.getMe("some-token")).rejects.toThrow(
        /Unable to connect to the server/
      );
    });
  });
});
