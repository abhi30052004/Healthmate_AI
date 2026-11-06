/**
 * Authentication Service for HealthMate AI
 * Centralizes authentication API requests, token lifecycle, and session verification.
 */

export interface User {
  id: string;
  name: string | null;
  email: string;
  is_active: boolean;
  created_at: string;
}

export interface UserLoginSummary {
  id: string;
  name: string | null;
  email: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: UserLoginSummary;
}

export type TokenResponse = LoginResponse;

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

/**
 * Resolves the backend base URL from Vite environment variables.
 * Defaults to http://127.0.0.1:8000 for standard local development.
 */
export function getApiBaseUrl(): string {
  return (
    import.meta.env.VITE_API_BASE_URL ??
    import.meta.env.VITE_API_URL ??
    "http://127.0.0.1:8000"
  );
}

/**
 * Safest compatible token storage strategy:
 * Uses sessionStorage which is isolated to the active browser tab/session,
 * mitigating persistent cross-tab/disk exposure while safely persisting
 * across within-tab reloads.
 */
const TOKEN_KEY = "healthmate_access_token";

export const tokenStorage = {
  get(): string | null {
    try {
      if (typeof window !== "undefined" && window.sessionStorage) {
        return window.sessionStorage.getItem(TOKEN_KEY);
      }
    } catch {
      // In private browsing or restricted environments, fallback gracefully
    }
    return null;
  },

  set(token: string): void {
    try {
      if (typeof window !== "undefined" && window.sessionStorage) {
        window.sessionStorage.setItem(TOKEN_KEY, token);
      }
    } catch {
      // Storage quota or security restriction fallback
    }
  },

  clear(): void {
    try {
      if (typeof window !== "undefined" && window.sessionStorage) {
        window.sessionStorage.removeItem(TOKEN_KEY);
      }
    } catch {
      // Ignore
    }
  },
};

/**
 * Standardized error parser converting FastAPI responses into human-readable strings.
 */
export async function parseApiError(res: Response): Promise<string> {
  try {
    const data = await res.json();
    if (typeof data.detail === "string") {
      return data.detail;
    }
    if (Array.isArray(data.detail) && data.detail.length > 0) {
      return data.detail
        .map((d: { msg?: string; loc?: string[] }) => {
          if (d.msg) {
            const field = d.loc && d.loc.length > 1 ? `${d.loc[d.loc.length - 1]}: ` : "";
            return `${field}${d.msg}`;
          }
          return "Validation error";
        })
        .join("; ");
    }
    if (data.message && typeof data.message === "string") {
      return data.message;
    }
  } catch {
    // Non-JSON response
  }
  return `Request failed with status ${res.status}`;
}

export const authService = {
  /**
   * Register a new user account with the FastAPI backend.
   */
  async register(payload: RegisterRequest): Promise<User> {
    const base = getApiBaseUrl();
    let res: Response;
    try {
      res = await fetch(`${base}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch {
      throw new ApiError(
        0,
        "Unable to connect to the server. Please check that the backend is running."
      );
    }

    if (!res.ok) {
      const message = await parseApiError(res);
      throw new ApiError(res.status, message);
    }

    return res.json();
  },

  /**
   * Authenticate credentials and receive a signed Bearer JWT token.
   */
  async login(payload: LoginRequest): Promise<LoginResponse> {
    const base = getApiBaseUrl();
    let res: Response;
    try {
      res = await fetch(`${base}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch {
      throw new ApiError(
        0,
        "Unable to connect to the server. Please check that the backend is running."
      );
    }

    if (!res.ok) {
      const message = await parseApiError(res);
      throw new ApiError(res.status, message);
    }

    return res.json();
  },

  /**
   * Fetch authenticated user profile via Bearer token verification.
   */
  async getMe(token: string): Promise<User> {
    const base = getApiBaseUrl();
    let res: Response;
    try {
      res = await fetch(`${base}/api/auth/me`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
    } catch {
      throw new ApiError(
        0,
        "Unable to connect to the server. Please check that the backend is running."
      );
    }

    if (!res.ok) {
      const message = await parseApiError(res);
      throw new ApiError(res.status, message);
    }

    return res.json();
  },

  /**
   * Renew the access token for a still-valid session (sliding renewal).
   */
  async refresh(token: string): Promise<LoginResponse> {
    const base = getApiBaseUrl();
    let res: Response;
    try {
      res = await fetch(`${base}/api/auth/refresh`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      throw new ApiError(0, "Unable to connect to the server.");
    }
    if (!res.ok) {
      throw new ApiError(res.status, await parseApiError(res));
    }
    return res.json();
  },

  /**
   * Ask the server to email a password reset link. The answer is identical whether or
   * not the address is registered, so this never reveals which emails have accounts.
   */
  async forgotPassword(email: string): Promise<string> {
    const base = getApiBaseUrl();
    let res: Response;
    try {
      res = await fetch(`${base}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
    } catch {
      throw new ApiError(0, "Unable to connect to the server. Please try again.");
    }
    if (!res.ok) {
      throw new ApiError(res.status, res.status === 429 ? "Too many requests. Please wait a minute and try again." : await parseApiError(res));
    }
    return (await res.json()).message as string;
  },

  /** Choose a new password using the single-use token from the emailed link. */
  async resetPassword(token: string, newPassword: string): Promise<string> {
    const base = getApiBaseUrl();
    let res: Response;
    try {
      res = await fetch(`${base}/api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, new_password: newPassword }),
      });
    } catch {
      throw new ApiError(0, "Unable to connect to the server. Please try again.");
    }
    if (!res.ok) {
      throw new ApiError(res.status, res.status === 429 ? "Too many attempts. Please wait a minute and try again." : await parseApiError(res));
    }
    return (await res.json()).message as string;
  },
};

export const registerUser = authService.register;
export const loginUser = authService.login;
export const getMe = authService.getMe;
