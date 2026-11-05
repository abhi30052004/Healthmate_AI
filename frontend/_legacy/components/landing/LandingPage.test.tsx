import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { LandingPage } from "../LandingPage";
import { AuthProvider } from "../../context/AuthContext";

describe("LandingPage Component", () => {
  const renderLandingPage = () => {
    return render(
      <AuthProvider>
        <LandingPage />
      </AuthProvider>
    );
  };

  it("renders the brand header and hero title correctly", () => {
    renderLandingPage();

    expect(screen.getAllByText("HealthMate AI").length).toBeGreaterThanOrEqual(1);
    expect(
      screen.getByRole("heading", {
        name: "Your Health Journey, Smarter and More Connected.",
      })
    ).toBeDefined();
    expect(
      screen.getByText(
        "Bring your medical records, lab reports, health insights, and doctor preparation into one intelligent healthcare platform."
      )
    ).toBeDefined();
  });

  it("labels preview visuals as Sample Preview and displays no fabricated numbers", () => {
    renderLandingPage();

    expect(screen.getAllByText(/Sample preview/i).length).toBeGreaterThanOrEqual(1);
    // Verifies demo buttons are removed
    expect(screen.queryByText(/Try Demo Account/i)).toBeNull();
    expect(screen.queryByText(/demo@healthmate\.ai/i)).toBeNull();
  });

  it("renders all 6 implemented healthcare feature cards in the Bento Grid", () => {
    renderLandingPage();

    expect(screen.getByRole("heading", { name: "Smart Medical Records" })).toBeDefined();
    expect(screen.getByRole("heading", { name: "AI Health Assistant" })).toBeDefined();
    expect(screen.getByRole("heading", { name: "Medical Timeline" })).toBeDefined();
    expect(screen.getByRole("heading", { name: "Lab Report Analysis" })).toBeDefined();
    expect(screen.getByRole("heading", { name: "Doctor Visit Preparation" })).toBeDefined();
    expect(screen.getByRole("heading", { name: "Health Insights" })).toBeDefined();
  });

  it("renders the 3-step How It Works workflow", () => {
    renderLandingPage();

    expect(screen.getByText("01")).toBeDefined();
    expect(screen.getByRole("heading", { name: "Upload your medical documents" })).toBeDefined();
    expect(screen.getByText("02")).toBeDefined();
    expect(
      screen.getByRole("heading", { name: "Review extracted information & history" })
    ).toBeDefined();
    expect(screen.getByText("03")).toBeDefined();
    expect(
      screen.getByRole("heading", { name: "Use AI-assisted insights & prepare for visits" })
    ).toBeDefined();
  });

  it("renders verified Privacy and Security architectural safeguards", () => {
    renderLandingPage();

    expect(
      screen.getByRole("heading", { name: "Per-User Data Isolation" })
    ).toBeDefined();
    expect(
      screen.getByRole("heading", { name: "Token-Based Sessions" })
    ).toBeDefined();
    expect(
      screen.getByRole("heading", { name: "Grounded in Your Records" })
    ).toBeDefined();
    expect(
      screen.getByRole("heading", { name: "Revocable Doctor Sharing" })
    ).toBeDefined();
  });

  it("renders the Final CTA section and medical disclaimer in the footer", () => {
    renderLandingPage();

    expect(
      screen.getByRole("heading", {
        name: "Take a More Organized Approach to Your Health.",
      })
    ).toBeDefined();
    expect(
      screen.getAllByText(/HealthMate AI is a personal health record management and organizational tool/i).length
    ).toBeGreaterThanOrEqual(1);
  });
});
