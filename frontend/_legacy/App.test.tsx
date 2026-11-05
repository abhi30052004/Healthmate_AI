import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import App from "./App";
import { tokenStorage } from "./services/authService";

beforeEach(() => {
  sessionStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
  sessionStorage.clear();
});

describe("App Authentication and Protected Routing Flow", () => {
  it("renders the unauthenticated login view initially when no token is in storage", async () => {
    render(<App />);
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Welcome Back" })).toBeDefined();
    });
    expect(screen.getByLabelText("Email Address")).toBeDefined();
    expect(screen.getByLabelText("Password")).toBeDefined();
    expect(screen.getByRole("tab", { name: /Sign In/i })).toBeDefined();
    expect(screen.getByRole("tab", { name: /Create Account/i })).toBeDefined();
  });

  it("switches to the registration tab and displays all registration fields", async () => {
    render(<App />);
    await waitFor(() => {
      expect(screen.getByRole("tab", { name: /Create Account/i })).toBeDefined();
    });

    const registerTab = screen.getByRole("tab", { name: /Create Account/i });
    fireEvent.click(registerTab);

    expect(screen.getByRole("heading", { name: "Create Account" })).toBeDefined();
    expect(screen.getByLabelText("Full Name")).toBeDefined();
    expect(screen.getByLabelText("Email Address")).toBeDefined();
    expect(screen.getByLabelText("Password")).toBeDefined();
    expect(screen.getByLabelText("Confirm Password")).toBeDefined();
  });

  it("completes registration, navigates to login with prefilled email, and displays success feedback", async () => {
    const mockNewUser = {
      id: "usr-999",
      name: "Dr. James Wilson",
      email: "wilson@oncology.org",
      is_active: true,
      created_at: "2026-10-28T10:00:00Z",
    };

    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string) => {
        if (url.includes("/api/auth/register")) {
          return Promise.resolve({
            ok: true,
            status: 201,
            json: async () => mockNewUser,
          });
        }
        return Promise.reject(new Error(`Unhandled URL: ${url}`));
      })
    );

    render(<App />);
    await waitFor(() => {
      expect(screen.getByRole("tab", { name: /Create Account/i })).toBeDefined();
    });

    fireEvent.click(screen.getByRole("tab", { name: /Create Account/i }));

    fireEvent.change(screen.getByLabelText("Full Name"), {
      target: { value: "Dr. James Wilson" },
    });
    fireEvent.change(screen.getByLabelText("Email Address"), {
      target: { value: "wilson@oncology.org" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "OncologyPass123!" },
    });
    fireEvent.change(screen.getByLabelText("Confirm Password"), {
      target: { value: "OncologyPass123!" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Create Account" }));

    // Should navigate to Login view with success alert and pre-populated email
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Welcome Back" })).toBeDefined();
      expect(
        screen.getByText("Account created for wilson@oncology.org. Please sign in to continue.")
      ).toBeDefined();
    });

    const emailInput = screen.getByLabelText("Email Address") as HTMLInputElement;
    expect(emailInput.value).toBe("wilson@oncology.org");
  });

  it("completes full login flow and unlocks the protected dashboard with profile and documents", async () => {
    const mockLoginRes = {
      access_token: "mock-jwt-token-1234",
      token_type: "bearer",
      expires_in: 900,
      user: {
        id: "d9e8f7a6-b5c4-4d3e-2f1a-0b9c8d7e6f5a",
        name: "Dr. Alice Morgan",
        email: "alice@hospital.org",
      },
    };

    const mockProfile = {
      id: "d9e8f7a6-b5c4-4d3e-2f1a-0b9c8d7e6f5a",
      name: "Dr. Alice Morgan",
      email: "alice@hospital.org",
      is_active: true,
      created_at: "2026-10-27T10:00:00Z",
    };

    const mockLive = { status: "ok", service: "healthmate-api" };
    const mockReady = { status: "ok", database: true, pgvector: true };
    const mockDocs = [
      {
        id: "doc-111",
        owner_id: "d9e8f7a6-b5c4-4d3e-2f1a-0b9c8d7e6f5a",
        filename: "cbc_report.pdf",
        mime_type: "application/pdf",
        file_size: 4096,
        checksum_sha256: "abcdef123456",
        processing_status: "extracted",
        is_verified: false,
        created_at: "2026-10-27T11:00:00Z",
      },
    ];

    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string) => {
        if (url.includes("/api/auth/login")) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => mockLoginRes,
          });
        }
        if (url.includes("/api/auth/me")) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => mockProfile,
          });
        }
        if (url.includes("/api/documents")) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => mockDocs,
          });
        }
        if (url.includes("/health/live")) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => mockLive,
          });
        }
        if (url.includes("/health/ready")) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => mockReady,
          });
        }
        return Promise.reject(new Error(`Unhandled URL: ${url}`));
      })
    );

    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Welcome Back" })).toBeDefined();
    });

    const emailInput = screen.getByLabelText("Email Address");
    const passwordInput = screen.getByLabelText("Password");
    const signInBtn = screen.getByRole("button", { name: "Sign In" });

    fireEvent.change(emailInput, { target: { value: "alice@hospital.org" } });
    fireEvent.change(passwordInput, { target: { value: "SecretPassword123!" } });
    fireEvent.click(signInBtn);

    // Protected dashboard should render
    await waitFor(() => {
      expect(screen.getByText(/Welcome, Dr. Alice Morgan/i)).toBeDefined();
    });

    // Token stored in sessionStorage
    expect(tokenStorage.get()).toBe("mock-jwt-token-1234");

    // Email displayed in navbar badge
    expect(screen.getAllByText("alice@hospital.org").length).toBeGreaterThanOrEqual(1);

    // Documents section should render the uploaded document
    await waitFor(() => {
      expect(screen.getByText("cbc_report.pdf")).toBeDefined();
    });
    expect(screen.getByText("Extracted")).toBeDefined();

    // Sign out should clear storage and return back to unauthenticated login view
    const signOutButtons = screen.getAllByRole("button", { name: /Sign Out/i });
    fireEvent.click(signOutButtons[0]);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Welcome Back" })).toBeDefined();
    });
    expect(tokenStorage.get()).toBeNull();
  });

  it("restores session on boot from sessionStorage using /api/auth/me", async () => {
    tokenStorage.set("existing-persisted-token");

    const mockProfile = {
      id: "usr-persisted",
      name: "Dr. Lisa Cuddy",
      email: "cuddy@hospital.org",
      is_active: true,
      created_at: "2026-10-27T08:00:00Z",
    };

    const mockLive = { status: "ok", service: "healthmate-api" };
    const mockReady = { status: "ok", database: true, pgvector: true };

    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string) => {
        if (url.includes("/api/auth/me")) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => mockProfile,
          });
        }
        if (url.includes("/api/documents")) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => [],
          });
        }
        if (url.includes("/health/live")) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => mockLive,
          });
        }
        if (url.includes("/health/ready")) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => mockReady,
          });
        }
        return Promise.reject(new Error(`Unhandled URL: ${url}`));
      })
    );

    render(<App />);

    // Directly unlocks dashboard without needing re-login
    await waitFor(() => {
      expect(screen.getByText(/Welcome, Dr. Lisa Cuddy/i)).toBeDefined();
    });
  });

  it("handles expired session (401 on /api/auth/me), clears token, and displays session expired warning", async () => {
    tokenStorage.set("expired-old-token");

    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string) => {
        if (url.includes("/api/auth/me")) {
          return Promise.resolve({
            ok: false,
            status: 401,
            json: async () => ({
              detail: "Invalid, expired, or malformed authentication token",
            }),
          });
        }
        return Promise.reject(new Error(`Unhandled URL: ${url}`));
      })
    );

    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Welcome Back" })).toBeDefined();
      expect(
        screen.getByText("Your session has expired. Please sign in again.")
      ).toBeDefined();
    });

    // Token must be cleared from storage
    expect(tokenStorage.get()).toBeNull();
  });
});
