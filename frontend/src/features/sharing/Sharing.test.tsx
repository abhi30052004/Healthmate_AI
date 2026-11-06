import React from "react";
import { screen, fireEvent, waitFor, within } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { SharingEmergencyView, buildShareUrl } from "./SharingEmergencyView";
import { PublicDoctorPortalView } from "./PublicDoctorPortalView";
import * as api from "../../api/client";
import { renderWithProviders, testProfile } from "../../test/utils";

vi.mock("../../api/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../api/client")>();
  return {
    ...actual,
    listDoctorShares: vi.fn(),
    createDoctorShare: vi.fn(),
    revokeDoctorShare: vi.fn(),
    getDoctorShareAudit: vi.fn(),
    listDocuments: vi.fn(),
    updateFamilyProfile: vi.fn(),
    getSharedHealthPortalView: vi.fn(),
  };
});

const resources = { document_ids: [], include_visit_pack: true, visit_pack_categories: [], include_medications: true, include_appointments: false };
const share = (over: Partial<api.DoctorSharingItem> = {}): api.DoctorSharingItem => ({
  id: "s1", owner_id: "u1", profile_id: "prof-1", profile_name: "Eva Tester", doctor_name: "Dr. Mukherjee", status: "active",
  is_expired: false, expires_at: new Date(Date.now() + 86_400_000).toISOString(), access_count: 2, shared_resources: resources,
  created_at: "2026-11-01T00:00:00Z", ...over,
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(api.listDoctorShares).mockResolvedValue([share()]);
  vi.mocked(api.listDocuments).mockResolvedValue([]);
});

describe("buildShareUrl", () => {
  it("points at the web app's /s/:token route, not the API's relative path", () => {
    expect(buildShareUrl("abc123")).toBe(`${window.location.origin}/s/abc123`);
  });
});

describe("SharingEmergencyView (real data)", () => {
  it("lists share links for the active profile with status, scope and access count", async () => {
    renderWithProviders(<SharingEmergencyView token="t" activeProfile={testProfile} />);
    const card = await screen.findByTestId("share-card");
    expect(within(card).getByText("Dr. Mukherjee")).toBeDefined();
    expect(within(card).getByText("Active")).toBeDefined();
    expect(within(card).getByText(/visit pack, medications/)).toBeDefined();
    expect(within(card).getByText(/Opened 2 times/)).toBeDefined();
    expect(api.listDoctorShares).toHaveBeenCalledWith("t", "prof-1");
  });

  it("creates a link, shows the full URL once, and never persists the raw token in the list", async () => {
    vi.mocked(api.createDoctorShare).mockResolvedValue({ ...share({ id: "s2" }), access_token: "SECRETTOKEN123", share_url: "/shared/SECRETTOKEN123" });
    renderWithProviders(<SharingEmergencyView token="t" activeProfile={testProfile} />);
    fireEvent.click((await screen.findAllByRole("button", { name: /New share link/i }))[0]);
    const dlg = await screen.findByRole("dialog");

    fireEvent.click(within(dlg).getByRole("button", { name: /Create link/i }));
    expect((await within(dlg).findByRole("alert")).textContent).toMatch(/Enter the doctor/);

    fireEvent.change(within(dlg).getByLabelText(/Doctor or clinic/i), { target: { value: "Dr. Rao" } });
    fireEvent.change(within(dlg).getByLabelText(/Link works for/i), { target: { value: "3" } });
    fireEvent.click(within(dlg).getByRole("button", { name: /Create link/i }));

    const url = await screen.findByRole("textbox", { name: "Share link" });
    expect((url as HTMLInputElement).value).toBe(`${window.location.origin}/s/SECRETTOKEN123`);
    const payload = vi.mocked(api.createDoctorShare).mock.calls[0][1];
    expect(payload).toMatchObject({ profile_id: "prof-1", doctor_name: "Dr. Rao", expires_in_days: 3 });
    expect(payload.shared_resources.include_visit_pack).toBe(true);
    expect(document.body.textContent).not.toContain("SECRETTOKEN123/"); // list rows don't contain it
  });

  it("refuses to create a link that shares nothing", async () => {
    renderWithProviders(<SharingEmergencyView token="t" activeProfile={testProfile} />);
    fireEvent.click((await screen.findAllByRole("button", { name: /New share link/i }))[0]);
    const dlg = await screen.findByRole("dialog");
    fireEvent.change(within(dlg).getByLabelText(/Doctor or clinic/i), { target: { value: "Dr. Rao" } });
    fireEvent.click(within(dlg).getByLabelText(/Visit pack/i));
    fireEvent.click(within(dlg).getByLabelText(/Current medications/i));
    fireEvent.click(within(dlg).getByRole("button", { name: /Create link/i }));
    expect((await within(dlg).findByRole("alert")).textContent).toMatch(/Choose at least one/i);
    expect(api.createDoctorShare).not.toHaveBeenCalled();
  });

  it("revokes only after confirmation", async () => {
    vi.mocked(api.revokeDoctorShare).mockResolvedValue(share({ status: "revoked" }));
    renderWithProviders(<SharingEmergencyView token="t" activeProfile={testProfile} />);
    fireEvent.click(await screen.findByRole("button", { name: "Revoke" }));
    expect(api.revokeDoctorShare).not.toHaveBeenCalled();
    const dlg = await screen.findByRole("dialog");
    fireEvent.click(within(dlg).getByRole("button", { name: "Revoke" }));
    await waitFor(() => expect(api.revokeDoctorShare).toHaveBeenCalledWith("t", "s1"));
  });

  it("emergency card edits are saved on the profile and shown only as self-reported", async () => {
    vi.mocked(api.updateFamilyProfile).mockResolvedValue(testProfile);
    const onChanged = vi.fn();
    renderWithProviders(<SharingEmergencyView token="t" activeProfile={testProfile} onProfilesChanged={onChanged} />);
    fireEvent.click(await screen.findByRole("tab", { name: /Emergency card/i }));
    fireEvent.change(screen.getByLabelText("Blood type"), { target: { value: "O+" } });
    expect(screen.getByTestId("emergency-card").textContent).toContain("O+");
    expect(screen.getByTestId("emergency-card").textContent).toMatch(/Self-reported information/);
    fireEvent.click(screen.getByRole("button", { name: /^Save$/ }));
    await waitFor(() => expect(api.updateFamilyProfile).toHaveBeenCalledWith("t", "prof-1", expect.objectContaining({ blood_type: "O+", allergies_summary: "Penicillin" })));
    await waitFor(() => expect(onChanged).toHaveBeenCalled());
  });
});

describe("PublicDoctorPortalView (no login)", () => {
  const view: api.DoctorSharedHealthView = {
    patient_name: "Eva Tester", patient_relationship: "self", patient_age: 34, doctor_name: "Dr. Mukherjee",
    expires_at: new Date(Date.now() + 86_400_000).toISOString(), status: "active", has_visit_pack: true,
    shared_resources: resources, allergies_summary: "Penicillin",
    documents: [], appointments: [],
    medications: [{ id: "m1", name: "Metformin", dosage: "500 mg", frequency: "Twice daily", is_active: true }],
  };

  it("renders only what was shared, read-only", async () => {
    vi.mocked(api.getSharedHealthPortalView).mockResolvedValue(view);
    renderWithProviders(<PublicDoctorPortalView shareToken="tok" />);
    expect(await screen.findByRole("heading", { name: "Eva Tester" })).toBeDefined();
    expect(screen.getByText("Metformin")).toBeDefined();
    expect(screen.getByRole("link", { name: /Download PDF/i }).getAttribute("href")).toContain("/api/shared-health/tok/visit-pack");
    expect(screen.queryByText(/Upcoming appointments/)).toBeNull(); // not included in this share
    expect(api.getSharedHealthPortalView).toHaveBeenCalledWith("tok");
  });

  it("fails closed for an expired/revoked/unknown link without revealing why", async () => {
    vi.mocked(api.getSharedHealthPortalView).mockRejectedValue(new api.ApiError(404, "gone"));
    renderWithProviders(<PublicDoctorPortalView shareToken="bad" />);
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toMatch(/isn't available/i);
    expect(screen.queryByText("Eva Tester")).toBeNull();
  });
});
