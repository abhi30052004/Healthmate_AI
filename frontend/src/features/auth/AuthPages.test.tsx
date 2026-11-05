import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { AuthLayout } from "./AuthLayout";
import { LoginForm } from "./LoginForm";
import { RegisterForm } from "./RegisterForm";
import { authService } from "../../services/authService";

describe("Step 5 - Auth Pages (Login & 3-Step Register)", () => {
  it("renders AuthLayout with brand marketing cards and form content", () => {
    render(
      <AuthLayout title="Welcome Back">
        <p>Login inputs go here</p>
      </AuthLayout>
    );

    expect(screen.getByText("Carry your health, not your paperwork.")).toBeDefined();
    expect(screen.getByText("Welcome Back")).toBeDefined();
    expect(screen.getByText("Login inputs go here")).toBeDefined();
  });

  describe("LoginForm", () => {
    it("validates empty submission and triggers error alert", async () => {
      render(
        <LoginForm
          onSuccess={vi.fn()}
          onNavigateRegister={vi.fn()}
        />
      );

      const submitBtn = screen.getByRole("button", { name: /Sign In to Workspace/i });
      fireEvent.click(submitBtn);

      expect(screen.getByRole("alert").textContent).toContain("Please enter both your email and password.");
    });

    it("calls authService.login on valid submission", async () => {
      const loginMock = vi.spyOn(authService, "login").mockResolvedValueOnce({
        access_token: "mock-jwt-token",
        token_type: "bearer",
        expires_in: 3600,
        user: { id: "u1", email: "user@example.com", name: "User One" },
      });

      const handleSuccess = vi.fn();
      render(
        <LoginForm
          onSuccess={handleSuccess}
          onNavigateRegister={vi.fn()}
          prefilledEmail="user@example.com"
        />
      );

      const passwordInput = screen.getByPlaceholderText("••••••••••••");
      fireEvent.change(passwordInput, { target: { value: "password123" } });

      const submitBtn = screen.getByRole("button", { name: /Sign In to Workspace/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(loginMock).toHaveBeenCalledWith({
          email: "user@example.com",
          password: "password123",
        });
      });
    });
  });

  describe("RegisterForm (3-Step Stepper)", () => {
    it("advances through Account -> First Profile -> Consent -> Register", async () => {
      const registerMock = vi.spyOn(authService, "register").mockResolvedValueOnce({
        id: "u-new",
        name: "Abhijit",
        email: "new@example.com",
        is_active: true,
        created_at: "2026-01-01T00:00:00Z",
      });

      const handleSuccess = vi.fn();
      render(<RegisterForm onSuccess={handleSuccess} onNavigateLogin={vi.fn()} />);

      // Step 1: Account
      fireEvent.change(screen.getByLabelText(/Full Name/i), { target: { value: "Abhijit" } });
      fireEvent.change(screen.getByLabelText(/Email Address/i), { target: { value: "new@example.com" } });
      fireEvent.change(screen.getByLabelText(/^Password/i), { target: { value: "securePass123" } });
      fireEvent.change(screen.getByLabelText(/Confirm Password/i), { target: { value: "securePass123" } });

      fireEvent.click(screen.getByRole("button", { name: /Continue to Patient Profile/i }));

      // Step 2: First Profile
      expect(screen.getByText("Who are you organizing records for?")).toBeDefined();
      fireEvent.click(screen.getByRole("button", { name: /My Parent/i }));
      fireEvent.change(screen.getByLabelText(/Profile Display Name/i), { target: { value: "Mother" } });

      fireEvent.click(screen.getByRole("button", { name: /Review Consent/i }));

      // Step 3: Consent
      expect(screen.getByText(/Privacy & Medical Responsibility:/i)).toBeDefined();
      const consentCheck = screen.getByRole("checkbox");
      fireEvent.click(consentCheck);

      fireEvent.click(screen.getByRole("button", { name: /Create Account/i }));

      await waitFor(() => {
        expect(registerMock).toHaveBeenCalledWith({
          name: "Abhijit",
          email: "new@example.com",
          password: "securePass123",
        });
      });
    });
  });
});
