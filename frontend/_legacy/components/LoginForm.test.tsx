import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { LoginForm } from "./LoginForm";
import { AuthProvider } from "../context/AuthContext";

afterEach(() => {
  vi.unstubAllGlobals();
});

function renderLoginForm(props: {
  onSwitchToRegister?: () => void;
  successMessage?: string | null;
  initialEmail?: string;
} = {}) {
  const onSwitchToRegister = props.onSwitchToRegister ?? vi.fn();
  return {
    onSwitchToRegister,
    ...render(
      <AuthProvider>
        <LoginForm
          onSwitchToRegister={onSwitchToRegister}
          successMessage={props.successMessage}
          initialEmail={props.initialEmail}
        />
      </AuthProvider>
    ),
  };
}

describe("LoginForm Component", () => {
  it("renders login inputs and controls", () => {
    renderLoginForm();

    expect(screen.getByRole("heading", { name: "Welcome Back" })).toBeDefined();
    expect(screen.getByLabelText("Email Address")).toBeDefined();
    expect(screen.getByLabelText("Password")).toBeDefined();
    expect(screen.getByRole("button", { name: "Sign In" })).toBeDefined();
  });

  it("populates initialEmail prop if provided", () => {
    renderLoginForm({ initialEmail: "dr.cuddy@hospital.org" });
    const emailInput = screen.getByLabelText("Email Address") as HTMLInputElement;
    expect(emailInput.value).toBe("dr.cuddy@hospital.org");
  });

  it("displays successMessage when passed (e.g. from registration completion)", () => {
    renderLoginForm({
      successMessage: "Account created for doctor@example.com. Please sign in to continue.",
    });

    expect(
      screen.getByText("Account created for doctor@example.com. Please sign in to continue.")
    ).toBeDefined();
  });

  it("validates empty email", async () => {
    renderLoginForm();
    fireEvent.click(screen.getByRole("button", { name: "Sign In" }));

    await waitFor(() => {
      expect(screen.getByText("Please enter your email address.")).toBeDefined();
    });
  });

  it("validates invalid email format", async () => {
    renderLoginForm();
    fireEvent.change(screen.getByLabelText("Email Address"), {
      target: { value: "not-an-email" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Sign In" }));

    await waitFor(() => {
      expect(screen.getByText(/Please enter a valid email address/i)).toBeDefined();
    });
  });

  it("validates missing password", async () => {
    renderLoginForm();
    fireEvent.change(screen.getByLabelText("Email Address"), {
      target: { value: "valid.doctor@hospital.org" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Sign In" }));

    await waitFor(() => {
      expect(screen.getByText("Please enter your password.")).toBeDefined();
    });
  });

  it("displays server error message on 401 invalid credentials", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string) => {
        if (url.includes("/api/auth/login")) {
          return Promise.resolve({
            ok: false,
            status: 401,
            json: async () => ({ detail: "Incorrect email or password" }),
          });
        }
        return Promise.reject(new Error("Unhandled"));
      })
    );

    renderLoginForm();

    fireEvent.change(screen.getByLabelText("Email Address"), {
      target: { value: "doctor@hospital.org" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "WrongPass123!" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Sign In" }));

    await waitFor(() => {
      expect(screen.getByText("Incorrect email or password")).toBeDefined();
    });
  });

  it("toggles password visibility", () => {
    renderLoginForm();
    const passwordInput = screen.getByLabelText("Password") as HTMLInputElement;
    expect(passwordInput.type).toBe("password");

    const toggleBtn = screen.getByRole("button", { name: /Show password/i });
    fireEvent.click(toggleBtn);
    expect(passwordInput.type).toBe("text");

    fireEvent.click(screen.getByRole("button", { name: /Hide password/i }));
    expect(passwordInput.type).toBe("password");
  });

  it("submits valid credentials and triggers login authentication", async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/api/auth/login")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            access_token: "jwt-token-xyz",
            token_type: "bearer",
            expires_in: 900,
            user: { id: "user-123", email: "sarah@hospital.org", name: "Dr. Sarah" },
          }),
        });
      }
      if (url.includes("/api/auth/me")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            id: "user-123",
            email: "sarah@hospital.org",
            name: "Dr. Sarah",
            is_active: true,
            created_at: "2025-01-15T08:30:00Z",
          }),
        });
      }
      return Promise.reject(new Error("Unhandled"));
    });
    vi.stubGlobal("fetch", fetchMock);

    renderLoginForm();
    fireEvent.change(screen.getByLabelText("Email Address"), {
      target: { value: "sarah@hospital.org" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "ValidPassword123" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Sign In" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/api/auth/login"),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ email: "sarah@hospital.org", password: "ValidPassword123" }),
        })
      );
    });
  });
});
