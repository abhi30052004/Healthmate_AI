import React from "react";
import { screen, fireEvent, waitFor, within } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { FamilyView } from "./FamilyView";
import * as api from "../../api/client";
import { renderWithProviders, testProfile, secondProfile } from "../../test/utils";

vi.mock("../../api/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../api/client")>();
  return { ...actual, createFamilyProfile: vi.fn(), updateFamilyProfile: vi.fn(), deactivateFamilyProfile: vi.fn() };
});

const props = () => ({
  token: "t",
  activeProfile: testProfile,
  profiles: [testProfile, secondProfile],
  onProfilesChanged: vi.fn().mockResolvedValue(undefined),
  onSelectProfile: vi.fn(),
});

beforeEach(() => vi.clearAllMocks());

describe("FamilyView (real data)", () => {
  it("lists profiles, marks the active one and offers to switch", () => {
    const p = props();
    renderWithProviders(<FamilyView {...p} />);
    expect(screen.getByText("Eva Tester")).toBeDefined();
    expect(screen.getByText("Aarav Tester")).toBeDefined();
    expect(screen.getByText("Viewing")).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: /Switch to Aarav/i }));
    expect(p.onSelectProfile).toHaveBeenCalledWith(secondProfile);
  });

  it("does not allow archiving the primary profile", () => {
    renderWithProviders(<FamilyView {...props()} />);
    expect(screen.queryByRole("button", { name: /Archive Eva Tester/i })).toBeNull();
    expect(screen.getByRole("button", { name: /Archive Aarav Tester/i })).toBeDefined();
  });

  it("adds a profile with the entered details and refreshes the list", async () => {
    const p = props();
    vi.mocked(api.createFamilyProfile).mockResolvedValue({ ...secondProfile, id: "p3", name: "Mira Tester" });
    renderWithProviders(<FamilyView {...p} />);
    fireEvent.click(screen.getByRole("button", { name: /Add family profile/i }));
    const dlg = await screen.findByRole("dialog");

    fireEvent.click(within(dlg).getByRole("button", { name: /Add profile/i }));
    expect((await within(dlg).findByRole("alert")).textContent).toMatch(/Enter a name/);

    fireEvent.change(within(dlg).getByLabelText(/Full name/i), { target: { value: "Mira Tester" } });
    fireEvent.change(within(dlg).getByLabelText(/Relationship/i), { target: { value: "parent" } });
    fireEvent.change(within(dlg).getByLabelText(/Known allergies/i), { target: { value: "Peanuts" } });
    fireEvent.click(within(dlg).getByRole("button", { name: /Add profile/i }));

    await waitFor(() => expect(api.createFamilyProfile).toHaveBeenCalled());
    expect(vi.mocked(api.createFamilyProfile).mock.calls[0][1]).toMatchObject({
      name: "Mira Tester", relationship: "parent", allergies_summary: "Peanuts", consent_status: "authorized",
    });
    await waitFor(() => expect(p.onProfilesChanged).toHaveBeenCalled());
  });

  it("blocks a future date of birth", async () => {
    renderWithProviders(<FamilyView {...props()} />);
    fireEvent.click(screen.getByRole("button", { name: /Add family profile/i }));
    const dlg = await screen.findByRole("dialog");
    fireEvent.change(within(dlg).getByLabelText(/Full name/i), { target: { value: "Future Kid" } });
    fireEvent.change(within(dlg).getByLabelText(/Date of birth/i), { target: { value: "2999-01-01" } });
    fireEvent.click(within(dlg).getByRole("button", { name: /Add profile/i }));
    expect((await within(dlg).findByRole("alert")).textContent).toMatch(/can't be in the future/i);
    expect(api.createFamilyProfile).not.toHaveBeenCalled();
  });

  it("archives a profile after confirmation", async () => {
    const p = props();
    vi.mocked(api.deactivateFamilyProfile).mockResolvedValue({
      profile_id: "prof-2", name: "Aarav Tester", is_active: false, message: "", record_retention_note: "Records are kept.",
    });
    renderWithProviders(<FamilyView {...p} />);
    fireEvent.click(screen.getByRole("button", { name: /Archive Aarav Tester/i }));
    const dlg = await screen.findByRole("dialog");
    fireEvent.click(within(dlg).getByRole("button", { name: /Archive profile/i }));
    await waitFor(() => expect(api.deactivateFamilyProfile).toHaveBeenCalledWith("t", "prof-2"));
    await waitFor(() => expect(p.onProfilesChanged).toHaveBeenCalled());
  });
});
