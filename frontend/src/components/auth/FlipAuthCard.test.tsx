import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { FlipAuthCard } from "./FlipAuthCard";
import { AuthProvider } from "../../context/AuthContext";

describe("FlipAuthCard Component", () => {
  it("renders with Sign In as default active mode", () => {
    render(
      <AuthProvider>
        <FlipAuthCard />
      </AuthProvider>
    );

    expect(screen.getByRole("tab", { name: /Sign In/i })).toBeDefined();
    expect(screen.getByRole("tab", { name: /Create Account/i })).toBeDefined();
    expect(screen.getByRole("heading", { name: "Welcome Back" })).toBeDefined();
    expect(screen.getByLabelText("Email Address")).toBeDefined();
  });

  it("flips to register mode when clicking Create Account tab", () => {
    render(
      <AuthProvider>
        <FlipAuthCard />
      </AuthProvider>
    );

    const registerTab = screen.getByRole("tab", { name: /Create Account/i });
    fireEvent.click(registerTab);

    expect(screen.getByRole("heading", { name: "Create Account" })).toBeDefined();
    expect(screen.getByLabelText("Full Name")).toBeDefined();
    expect(screen.getByLabelText("Confirm Password")).toBeDefined();
  });

  it("renders with initialMode='register' directly on registration side", () => {
    render(
      <AuthProvider>
        <FlipAuthCard initialMode="register" />
      </AuthProvider>
    );

    expect(screen.getByRole("heading", { name: "Create Account" })).toBeDefined();
    expect(screen.getByLabelText("Full Name")).toBeDefined();
  });
});

