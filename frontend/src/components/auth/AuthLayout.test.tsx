import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AuthLayout } from "./AuthLayout";
import { AuthProvider } from "../../context/AuthContext";

describe("AuthLayout Component", () => {
  it("renders the brand header, illustration, and back to home button", () => {
    const handleBack = vi.fn();
    render(
      <AuthProvider>
        <AuthLayout onBackToHome={handleBack} />
      </AuthProvider>
    );

    expect(screen.getAllByText("HealthMate AI").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole("button", { name: /Back to Home/i })).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: /Back to Home/i }));
    expect(handleBack).toHaveBeenCalledTimes(1);
  });
});

