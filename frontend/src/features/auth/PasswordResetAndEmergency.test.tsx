import React from "react";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { Route, Routes } from "react-router-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ForgotPasswordPage, ResetPasswordPage } from "./PasswordResetPages";
import { PublicEmergencyCardPage } from "../sharing/PublicEmergencyCardPage";
import { SharingEmergencyView, buildEmergencyUrl } from "../sharing/SharingEmergencyView";
import { authService, ApiError } from "../../services/authService";
import * as api from "../../api/client";
import { renderWithProviders, testProfile } from "../../test/utils";

vi.mock("../../api/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../api/client")>();
  return {
    ...actual,
    listDoctorShares: vi.fn().mockResolvedValue([]),
    listDocuments: vi.fn().mockResolvedValue([]),
    getEmergencyLink: vi.fn(),
    enableEmergencyLink: vi.fn(),
    disableEmergencyLink: vi.fn(),
    getPublicEmergencyCard: vi.fn(),
  };
});

beforeEach(() => vi.clearAllMocks());

describe("forgot password", () => {
  it("validates the email, then shows the same neutral confirmation", async () => {
    const spy = vi.spyOn(authService, "forgotPassword").mockResolvedValue("ok");
    renderWithProviders(<ForgotPasswordPage />);
    fireEvent.change(screen.getByLabelText(/Email Address/i), { target: { value: "not-an-email" } });
    fireEvent.click(screen.getByRole("button", { name: /Email me a reset link/i }));
    expect((await screen.findByRole("alert")).textContent).toMatch(/valid email/i);
    expect(spy).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText(/Email Address/i), { target: { value: "eva@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: /Email me a reset link/i }));
    const done = await screen.findByTestId("reset-link-sent");
    expect(done.textContent).toMatch(/If an account exists/);
    expect(spy).toHaveBeenCalledWith("eva@example.com");
  });
});

describe("reset password", () => {
  const renderReset = (route: string) =>
    renderWithProviders(
      <Routes>
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/login" element={<div>LOGIN PAGE</div>} />
      </Routes>,
      { route }
    );

  it("explains a missing token instead of showing a form", () => {
    renderReset("/reset-password");
    expect(screen.getByRole("alert").textContent).toMatch(/missing its token/i);
  });

  it("rejects weak or mismatched passwords locally, then sends the token and goes to login", async () => {
    const spy = vi.spyOn(authService, "resetPassword").mockResolvedValue("done");
    renderReset("/reset-password?token=abc123");
    const pw = screen.getByLabelText(/^New password/i);
    const confirm = screen.getByLabelText(/Confirm new password/i);

    fireEvent.change(pw, { target: { value: "short" } });
    fireEvent.click(screen.getByRole("button", { name: /Update password/i }));
    expect((await screen.findByRole("alert")).textContent).toMatch(/at least 8/i);

    fireEvent.change(pw, { target: { value: "GoodPass123!" } });
    fireEvent.change(confirm, { target: { value: "Different123!" } });
    fireEvent.click(screen.getByRole("button", { name: /Update password/i }));
    await waitFor(() => expect(screen.getByRole("alert").textContent).toMatch(/don't match/i));
    expect(spy).not.toHaveBeenCalled();

    fireEvent.change(confirm, { target: { value: "GoodPass123!" } });
    fireEvent.click(screen.getByRole("button", { name: /Update password/i }));
    await screen.findByText("LOGIN PAGE");
    expect(spy).toHaveBeenCalledWith("abc123", "GoodPass123!");
  });

  it("offers a fresh link when the token is expired", async () => {
    vi.spyOn(authService, "resetPassword").mockRejectedValue(new ApiError(400, "This reset link is invalid or has expired. Please request a new one."));
    renderReset("/reset-password?token=old");
    fireEvent.change(screen.getByLabelText(/^New password/i), { target: { value: "GoodPass123!" } });
    fireEvent.change(screen.getByLabelText(/Confirm new password/i), { target: { value: "GoodPass123!" } });
    fireEvent.click(screen.getByRole("button", { name: /Update password/i }));
    expect((await screen.findByRole("link", { name: /Request a new link/i })).getAttribute("href")).toBe("/forgot-password");
  });
});

describe("public emergency card page", () => {
  const renderCard = () =>
    renderWithProviders(
      <Routes>
        <Route path="/e/:token" element={<PublicEmergencyCardPage />} />
      </Routes>,
      { route: "/e/TOKEN" }
    );

  it("shows the minimal card and a tap-to-call link", async () => {
    vi.mocked(api.getPublicEmergencyCard).mockResolvedValue({
      name: "Eva Tester", age_years: 34, blood_type: "O+", allergies: "Penicillin", conditions: null,
      emergency_contact_name: "Ravi", emergency_contact_phone: "+91 99999 00000", updated_at: "2026-11-01T00:00:00Z",
    });
    renderCard();
    const card = await screen.findByTestId("public-emergency-card");
    expect(card.textContent).toContain("Eva Tester");
    expect(card.textContent).toContain("O+");
    expect(card.textContent).toContain("None recorded"); // conditions blank, not hidden
    expect(screen.getByRole("link", { name: /Call/ }).getAttribute("href")).toBe("tel:+919999900000");
    expect(api.getPublicEmergencyCard).toHaveBeenCalledWith("TOKEN");
  });

  it("says plainly when the card has been turned off", async () => {
    vi.mocked(api.getPublicEmergencyCard).mockRejectedValue(new api.ApiError(404, "nope"));
    renderCard();
    expect((await screen.findByRole("alert")).textContent).toMatch(/isn't available/i);
  });
});

describe("emergency QR controls", () => {
  it("is off by default, can be turned on to reveal the QR link, and turned off again", async () => {
    vi.mocked(api.getEmergencyLink).mockResolvedValue({ enabled: false, token: null });
    vi.mocked(api.enableEmergencyLink).mockResolvedValue({ enabled: true, token: "CARDTOKEN" });
    vi.mocked(api.disableEmergencyLink).mockResolvedValue({ enabled: false, token: null });

    renderWithProviders(<SharingEmergencyView token="t" activeProfile={testProfile} />);
    fireEvent.click(await screen.findByRole("tab", { name: /Emergency card/i }));
    fireEvent.click(await screen.findByRole("button", { name: /Turn on emergency QR/i }));

    const link = (await screen.findByRole("textbox", { name: "Emergency card link" })) as HTMLInputElement;
    expect(link.value).toBe(buildEmergencyUrl("CARDTOKEN"));
    expect(api.enableEmergencyLink).toHaveBeenCalledWith("t", "prof-1", false);

    fireEvent.click(screen.getByRole("button", { name: /Turn off/i }));
    await screen.findByRole("button", { name: /Turn on emergency QR/i });
    expect(api.disableEmergencyLink).toHaveBeenCalledWith("t", "prof-1");
  });
});
