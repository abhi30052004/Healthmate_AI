import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import App from "./App";
import { authService } from "./services/authService";

describe("Step 14 - App Full Integration & Navigation Flow", () => {
  beforeEach(() => {
    window.history.pushState({}, "", "/");
  });

  it("renders Landing Page on initial load and navigates to Register and Login", () => {
    render(<App />);

    // Landing Page
    expect(screen.getByText(/One place for your family’s health records/i)).toBeDefined();
    expect(screen.getByText("Private by Default")).toBeDefined();

    // Click Get Started -> takes user to Register form
    const getStartedButtons = screen.getAllByRole("button", { name: /Get started free/i });
    fireEvent.click(getStartedButtons[0]);

    expect(screen.getByText(/Create your free health vault/i)).toBeDefined();
    expect(screen.getByText("1. Account")).toBeDefined();

    // Click sign in button from Register Form
    const signInBtn = screen.getByRole("button", { name: /Sign in/i });
    fireEvent.click(signInBtn);

    expect(screen.getByText(/Welcome back/i)).toBeDefined();
    expect(screen.getByRole("button", { name: /Sign In to Workspace/i })).toBeDefined();
  });

  it("logs in and navigates across core workspace tabs in the AppShell", async () => {
    vi.spyOn(authService, "login").mockResolvedValue({
      access_token: "mock-token",
      token_type: "bearer",
      expires_in: 3600,
      user: {
        id: "user-abhijit",
        name: "Dr. Abhijit Bhunia",
        email: "abhijit.bhunia@healthmate.ai",
      },
    });

    render(<App />);

    // Go to login from Landing Page navbar
    const loginBtn = screen.getAllByRole("button", { name: /Log in/i })[0];
    fireEvent.click(loginBtn);

    // Fill credentials in Login Form
    const emailInput = screen.getByPlaceholderText("name@example.com");
    const passwordInput = screen.getByPlaceholderText("••••••••••••");
    fireEvent.change(emailInput, { target: { value: "abhijit.bhunia@healthmate.ai" } });
    fireEvent.change(passwordInput, { target: { value: "SecretPass123!" } });

    // Submit login
    const submitBtn = screen.getByRole("button", { name: /Sign In to Workspace/i });
    fireEvent.click(submitBtn);

    // Wait for in-app workspace overview to load
    await waitFor(
      () => {
        expect(screen.getByText(/Good day, Dr. Abhijit Bhunia/i)).toBeDefined();
      },
      { timeout: 3500 }
    );

    // Navigate to Health Records
    const recordsNav = screen.getAllByRole("button", { name: /Health Records/i });
    fireEvent.click(recordsNav[0]);
    expect(screen.getByText("Health Records & Laboratory Findings")).toBeDefined();

    // Navigate to Medicines
    const medicinesNav = screen.getAllByRole("button", { name: /Medicines/i });
    fireEvent.click(medicinesNav[0]);
    expect(screen.getByText("Medications & Smart Schedule")).toBeDefined();

    // Navigate to Timeline & Trends
    const trendsNav = screen.getAllByRole("button", { name: /Timeline & Trends/i });
    fireEvent.click(trendsNav[0]);
    expect(screen.getByText("Interactive Medical Timeline & Longitudinal Trends")).toBeDefined();

    // Navigate to Doctor Visit Pack
    const doctorNav = screen.getAllByRole("button", { name: /Doctor Visit Pack/i });
    fireEvent.click(doctorNav[0]);
    expect(screen.getByText(/Doctor Visit Preparation Pack/i)).toBeDefined();

    // Navigate to AI Assistant
    const assistantNav = screen.getAllByRole("button", { name: /AI Assistant/i });
    fireEvent.click(assistantNav[0]);
    expect(screen.getByText(/AI Health Assistant/i)).toBeDefined();

    // Navigate to Family Profiles
    const familyNav = screen.getAllByRole("button", { name: /Family/i });
    fireEvent.click(familyNav[0]);
    expect(screen.getByText(/Family Health Profiles/i)).toBeDefined();

    // Navigate to Privacy Center
    const privacyNav = screen.getAllByRole("button", { name: /Privacy/i });
    fireEvent.click(privacyNav[0]);
    expect(screen.getByText(/Privacy & Security Centre/i)).toBeDefined();

    // Navigate to Settings
    const settingsNav = screen.getAllByRole("button", { name: /Settings/i });
    fireEvent.click(settingsNav[0]);
    expect(screen.getByText(/Settings & Preferences/i)).toBeDefined();
  });
});
