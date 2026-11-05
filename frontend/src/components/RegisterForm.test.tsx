import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { RegisterForm } from "./RegisterForm";
import { AuthProvider } from "../context/AuthContext";

afterEach(() => {
  vi.unstubAllGlobals();
});

function renderRegisterForm(onSwitchToLogin = vi.fn()) {
  return {
    onSwitchToLogin,
    ...render(
      <AuthProvider>
        <RegisterForm onSwitchToLogin={onSwitchToLogin} />
      </AuthProvider>
    ),
  };
}

describe("RegisterForm Component", () => {
  it("renders all registration fields and labels", () => {
    renderRegisterForm();

    expect(screen.getByRole("heading", { name: "Create Account" })).toBeDefined();
    expect(screen.getByLabelText("Full Name")).toBeDefined();
    expect(screen.getByLabelText("Email Address")).toBeDefined();
    expect(screen.getByLabelText("Password")).toBeDefined();
    expect(screen.getByLabelText("Confirm Password")).toBeDefined();
    expect(screen.getByRole("button", { name: "Create Account" })).toBeDefined();
  });

  it("validates required name field", async () => {
    renderRegisterForm();
    const submitBtn = screen.getByRole("button", { name: "Create Account" });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText("Please enter your full name.")).toBeDefined();
    });
  });

  it("validates required email field", async () => {
    renderRegisterForm();
    fireEvent.change(screen.getByLabelText("Full Name"), {
      target: { value: "Dr. Allison Cameron" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create Account" }));

    await waitFor(() => {
      expect(screen.getByText("Please enter your email address.")).toBeDefined();
    });
  });

  it("validates invalid email format", async () => {
    renderRegisterForm();
    fireEvent.change(screen.getByLabelText("Full Name"), {
      target: { value: "Dr. Allison Cameron" },
    });
    fireEvent.change(screen.getByLabelText("Email Address"), {
      target: { value: "invalid-email-format" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create Account" }));

    await waitFor(() => {
      expect(
        screen.getByText(/Please enter a valid email address/i)
      ).toBeDefined();
    });
  });

  it("validates password length (minimum 8 characters)", async () => {
    renderRegisterForm();
    fireEvent.change(screen.getByLabelText("Full Name"), {
      target: { value: "Dr. Allison Cameron" },
    });
    fireEvent.change(screen.getByLabelText("Email Address"), {
      target: { value: "cameron@hospital.org" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "short1!" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create Account" }));

    await waitFor(() => {
      expect(
        screen.getByText("Password must be at least 8 characters long.")
      ).toBeDefined();
    });
  });

  it("validates password complexity (requires at least one letter)", async () => {
    renderRegisterForm();
    fireEvent.change(screen.getByLabelText("Full Name"), {
      target: { value: "Dr. Allison Cameron" },
    });
    fireEvent.change(screen.getByLabelText("Email Address"), {
      target: { value: "cameron@hospital.org" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "12345678!" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create Account" }));

    await waitFor(() => {
      expect(screen.getByText("Password must contain at least one letter.")).toBeDefined();
    });
  });

  it("validates password complexity (requires digit or special character)", async () => {
    renderRegisterForm();
    fireEvent.change(screen.getByLabelText("Full Name"), {
      target: { value: "Dr. Allison Cameron" },
    });
    fireEvent.change(screen.getByLabelText("Email Address"), {
      target: { value: "cameron@hospital.org" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "abcdefghij" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create Account" }));

    await waitFor(() => {
      expect(
        screen.getByText("Password must contain at least one digit or special character.")
      ).toBeDefined();
    });
  });

  it("validates confirm password mismatch", async () => {
    renderRegisterForm();
    fireEvent.change(screen.getByLabelText("Full Name"), {
      target: { value: "Dr. Allison Cameron" },
    });
    fireEvent.change(screen.getByLabelText("Email Address"), {
      target: { value: "cameron@hospital.org" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "StrongPass123!" },
    });
    fireEvent.change(screen.getByLabelText("Confirm Password"), {
      target: { value: "DifferentPass123!" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create Account" }));

    await waitFor(() => {
      expect(screen.getByText("Passwords do not match.")).toBeDefined();
    });
  });

  it("toggles password and confirm password visibility", () => {
    renderRegisterForm();
    const passwordInput = screen.getByLabelText("Password") as HTMLInputElement;
    const confirmPasswordInput = screen.getByLabelText("Confirm Password") as HTMLInputElement;

    expect(passwordInput.type).toBe("password");
    expect(confirmPasswordInput.type).toBe("password");

    const toggleBtns = screen.getAllByRole("button", { name: /Show/i });
    fireEvent.click(toggleBtns[0]);
    expect(passwordInput.type).toBe("text");

    fireEvent.click(toggleBtns[1]);
    expect(confirmPasswordInput.type).toBe("text");
  });

  it("successfully registers user and navigates with email callback", async () => {
    const onSwitch = vi.fn();
    const mockUser = {
      id: "usr-cameron",
      name: "Dr. Allison Cameron",
      email: "cameron@hospital.org",
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
            json: async () => mockUser,
          });
        }
        return Promise.reject(new Error("Unhandled"));
      })
    );

    renderRegisterForm(onSwitch);

    fireEvent.change(screen.getByLabelText("Full Name"), {
      target: { value: "Dr. Allison Cameron" },
    });
    fireEvent.change(screen.getByLabelText("Email Address"), {
      target: { value: "cameron@hospital.org" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "SecurePass123!" },
    });
    fireEvent.change(screen.getByLabelText("Confirm Password"), {
      target: { value: "SecurePass123!" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Create Account" }));

    await waitFor(() => {
      expect(onSwitch).toHaveBeenCalledWith("cameron@hospital.org");
    });
  });

  it("displays server error message on duplicate email registration", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string) => {
        if (url.includes("/api/auth/register")) {
          return Promise.resolve({
            ok: false,
            status: 409,
            json: async () => ({ detail: "A user with this email already exists" }),
          });
        }
        return Promise.reject(new Error("Unhandled"));
      })
    );

    renderRegisterForm();

    fireEvent.change(screen.getByLabelText("Full Name"), {
      target: { value: "Dr. Allison Cameron" },
    });
    fireEvent.change(screen.getByLabelText("Email Address"), {
      target: { value: "existing@hospital.org" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "SecurePass123!" },
    });
    fireEvent.change(screen.getByLabelText("Confirm Password"), {
      target: { value: "SecurePass123!" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Create Account" }));

    await waitFor(() => {
      expect(screen.getByText("A user with this email already exists")).toBeDefined();
    });
  });
});
