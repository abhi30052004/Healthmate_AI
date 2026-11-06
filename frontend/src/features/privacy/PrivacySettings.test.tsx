import React from "react";
import { screen, fireEvent, waitFor, within } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { PrivacyView } from "./PrivacyView";
import { SettingsView } from "../settings/SettingsView";
import { AuthProvider } from "../../context/AuthContext";
import * as api from "../../api/client";
import { renderWithProviders, testProfile, testUser } from "../../test/utils";

vi.mock("../../api/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../api/client")>();
  return {
    ...actual,
    listDoctorShares: vi.fn(),
    revokeDoctorShare: vi.fn(),
    getDoctorShareAudit: vi.fn(),
    getDataQualitySummary: vi.fn(),
    listDuplicateCandidates: vi.fn(),
    scanDuplicates: vi.fn(),
    dismissDuplicateCandidate: vi.fn(),
    downloadAccountExport: vi.fn(),
    deleteAccount: vi.fn(),
    renameAccount: vi.fn(),
    listReminders: vi.fn(),
    createReminder: vi.fn(),
    deleteReminder: vi.fn(),
  };
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(api.listDoctorShares).mockResolvedValue([]);
  vi.mocked(api.getDataQualitySummary).mockResolvedValue({
    total_candidates: 0, pending_candidates: 0, high_confidence_candidates: 0, confirmed_duplicates: 0,
    resolved_duplicates: 0, dismissed_candidates: 0, document_candidates: 0, observation_candidates: 0, last_scan_at: null,
  });
  vi.mocked(api.listDuplicateCandidates).mockResolvedValue({ items: [], total: 0, page: 1, page_size: 10, total_pages: 1 });
  vi.mocked(api.listReminders).mockResolvedValue([]);
});

const wrap = (ui: React.ReactElement) => renderWithProviders(<AuthProvider>{ui}</AuthProvider>);

describe("PrivacyView (real data)", () => {
  it("says plainly when nobody has access, instead of showing sample audit rows", async () => {
    wrap(<PrivacyView token="t" activeProfile={testProfile} />);
    expect(await screen.findByText(/Only you can see your records/i)).toBeDefined();
    expect(screen.queryByText(/152\.58/)).toBeNull();
  });

  it("scans for duplicates for the active profile", async () => {
    vi.mocked(api.scanDuplicates).mockResolvedValue({
      total_candidates: 1, pending_candidates: 1, high_confidence_candidates: 0, confirmed_duplicates: 0,
      resolved_duplicates: 0, dismissed_candidates: 0, document_candidates: 1, observation_candidates: 0, last_scan_at: null,
    });
    wrap(<PrivacyView token="t" activeProfile={testProfile} />);
    fireEvent.click(await screen.findByRole("button", { name: /Scan now/i }));
    await waitFor(() => expect(api.scanDuplicates).toHaveBeenCalledWith("t", "prof-1"));
  });

  it("exports data on request", async () => {
    vi.mocked(api.downloadAccountExport).mockResolvedValue(undefined);
    wrap(<PrivacyView token="t" activeProfile={testProfile} />);
    fireEvent.click(await screen.findByRole("button", { name: /Export my data/i }));
    await waitFor(() => expect(api.downloadAccountExport).toHaveBeenCalledWith("t"));
  });

  it("deleting the account needs the typed phrase AND the password, and shows server rejection", async () => {
    vi.mocked(api.deleteAccount).mockRejectedValue(new api.ApiError(403, "Incorrect password."));
    wrap(<PrivacyView token="t" activeProfile={testProfile} />);
    fireEvent.click(await screen.findByRole("button", { name: /^Delete account$/i }));
    const dlg = await screen.findByRole("dialog");

    fireEvent.click(within(dlg).getByRole("button", { name: /Delete everything/i }));
    expect((await within(dlg).findByRole("alert")).textContent).toMatch(/Type DELETE/);
    expect(api.deleteAccount).not.toHaveBeenCalled();

    fireEvent.change(within(dlg).getByLabelText(/Type DELETE/i), { target: { value: "DELETE" } });
    fireEvent.change(within(dlg).getByLabelText(/Your password/i), { target: { value: "nope" } });
    fireEvent.click(within(dlg).getByRole("button", { name: /Delete everything/i }));
    await waitFor(() => expect(api.deleteAccount).toHaveBeenCalledWith("t", "nope"));
    expect((await within(dlg).findByRole("alert")).textContent).toMatch(/Incorrect password/);
  });
});

describe("SettingsView (real data)", () => {
  it("no longer offers fake push/Telegram channels", async () => {
    wrap(<SettingsView token="t" activeProfile={testProfile} user={testUser} />);
    expect(await screen.findByText(/No reminders/)).toBeDefined();
    expect(screen.queryByText(/Telegram/i)).toBeNull();
    expect(screen.queryByText(/Push/i)).toBeNull();
  });

  it("toggles Simple mode and renames the account", async () => {
    const toggle = vi.fn();
    vi.mocked(api.renameAccount).mockResolvedValue({ ...testUser, name: "Eva T." });
    wrap(<SettingsView token="t" activeProfile={testProfile} user={testUser} onToggleSimpleMode={toggle} />);
    fireEvent.click(screen.getByRole("switch", { name: "Simple mode" }));
    expect(toggle).toHaveBeenCalledWith(true);
    fireEvent.change(screen.getByLabelText("Your name"), { target: { value: "Eva T." } });
    fireEvent.click(screen.getByRole("button", { name: /Save name/i }));
    await waitFor(() => expect(api.renameAccount).toHaveBeenCalledWith("t", "Eva T."));
  });

  it("creates a reminder with an ISO time and the profile id, and blocks the past", async () => {
    vi.mocked(api.createReminder).mockResolvedValue({} as any);
    wrap(<SettingsView token="t" activeProfile={testProfile} user={testUser} />);
    await screen.findByText(/No reminders/);
    fireEvent.change(screen.getByLabelText(/Remind me to/i), { target: { value: "Book test" } });
    fireEvent.change(screen.getByLabelText("Date"), { target: { value: "2020-01-01" } });
    fireEvent.click(screen.getByRole("button", { name: /^Add$/ }));
    expect((await screen.findByRole("alert")).textContent).toMatch(/future/i);
    expect(api.createReminder).not.toHaveBeenCalled();

    const next = new Date(Date.now() + 2 * 86_400_000);
    const d = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-${String(next.getDate()).padStart(2, "0")}`;
    fireEvent.change(screen.getByLabelText("Date"), { target: { value: d } });
    fireEvent.click(screen.getByRole("button", { name: /^Add$/ }));
    await waitFor(() => expect(api.createReminder).toHaveBeenCalled());
    expect(vi.mocked(api.createReminder).mock.calls[0][1]).toMatchObject({ title: "Book test", profile_id: "prof-1", frequency: "once" });
  });
});
