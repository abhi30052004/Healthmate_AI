import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { DoctorSharing } from "./DoctorSharing";
import { DoctorSharedPortal } from "./DoctorSharedPortal";
import type {
  DoctorSharingItem,
  FamilyProfile,
  DocumentItem,
  DoctorSharedHealthView,
} from "../api/client";

// Mock API client methods
vi.mock("../api/client", async () => {
  const actual = await vi.importActual("../api/client");
  return {
    ...actual,
    listDoctorShares: vi.fn(),
    createDoctorShare: vi.fn(),
    revokeDoctorShare: vi.fn(),
    getDoctorShareAudit: vi.fn(),
    getSharedHealthPortalView: vi.fn(),
  };
});

import {
  listDoctorShares,
  createDoctorShare,
  revokeDoctorShare,
  getDoctorShareAudit,
  getSharedHealthPortalView,
} from "../api/client";

describe("DoctorSharing Component", () => {
  const mockToken = "mock-jwt-token";

  const sampleProfiles: FamilyProfile[] = [
    {
      id: "prof-1",
      owner_id: "user-1",
      name: "Alex Morgan",
      relationship: "self",
      is_primary: true,
      is_active: true,
      is_dependent: false,
      consent_status: "authorized",
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    },
    {
      id: "prof-2",
      owner_id: "user-1",
      name: "Leo Morgan",
      relationship: "child",
      is_primary: false,
      is_active: true,
      is_dependent: true,
      consent_status: "authorized",
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    },
  ];

  const sampleDocuments: DocumentItem[] = [
    {
      id: "doc-1",
      owner_id: "user-1",
      profile_id: "prof-2",
      filename: "leo_blood_panel.pdf",
      mime_type: "application/pdf",
      file_size: 1024,
      checksum_sha256: "hash1",
      processing_status: "completed",
      is_verified: true,
      created_at: "2026-01-01T00:00:00Z",
    },
  ];

  const sampleShares: DoctorSharingItem[] = [
    {
      id: "share-1",
      owner_id: "user-1",
      profile_id: "prof-2",
      profile_name: "Leo Morgan",
      doctor_name: "Dr. Sarah Jenkins",
      doctor_email: "dr.jenkins@clinic.org",
      status: "active",
      is_expired: false,
      expires_at: "2026-11-10T12:00:00Z",
      access_count: 2,
      last_accessed_at: "2026-10-29T10:30:00Z",
      shared_resources: {
        document_ids: ["doc-1"],
        include_visit_pack: true,
        visit_pack_categories: ["documents", "observations"],
        include_medications: true,
        include_appointments: false,
      },
      notes: "Please review recent blood test results.",
      created_at: "2026-10-28T09:00:00Z",
    },
    {
      id: "share-2",
      owner_id: "user-1",
      profile_id: "prof-1",
      profile_name: "Alex Morgan",
      doctor_name: "Dr. Gregory House",
      status: "revoked",
      is_expired: false,
      expires_at: "2026-11-01T12:00:00Z",
      revoked_at: "2026-10-28T14:00:00Z",
      access_count: 0,
      shared_resources: {
        document_ids: [],
        include_visit_pack: true,
        visit_pack_categories: ["documents"],
        include_medications: false,
        include_appointments: false,
      },
      created_at: "2026-10-27T09:00:00Z",
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (listDoctorShares as any).mockResolvedValue(sampleShares);
  });

  it("1. renders sharing sessions with correct badges and details", async () => {
    render(
      <DoctorSharing
        token={mockToken}
        activeProfile={sampleProfiles[1]}
        profiles={sampleProfiles}
        documents={sampleDocuments}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Dr. Sarah Jenkins")).toBeDefined();
      expect(screen.getByText("Dr. Gregory House")).toBeDefined();
    });

    expect(screen.getByText("Active")).toBeDefined();
    expect(screen.getByText("Revoked")).toBeDefined();
    expect(screen.getAllByText("📋 Visit Pack").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("💊 Medications")).toBeDefined();
  });

  it("2. validates required fields in the creation form", async () => {
    render(
      <DoctorSharing
        token={mockToken}
        activeProfile={sampleProfiles[1]}
        profiles={sampleProfiles}
        documents={sampleDocuments}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Dr. Sarah Jenkins")).toBeDefined();
    });

    // Open creation modal
    fireEvent.click(screen.getByText("➕ New Secure Share"));
    expect(screen.getByText("Create Secure Doctor Share")).toBeDefined();

    // Click confirm without entering doctor name
    fireEvent.click(screen.getByText("Confirm & Generate Share Link"));
    await waitFor(() => {
      expect(screen.getByText("Doctor's name is required.")).toBeDefined();
    });

    // Enter doctor name but no resources selected
    const nameInput = screen.getByPlaceholderText("e.g. Dr. Sarah Jenkins");
    fireEvent.change(nameInput, { target: { value: "Dr. Lisa Cuddy" } });
    fireEvent.click(screen.getByText("Confirm & Generate Share Link"));

    await waitFor(() => {
      expect(
        screen.getByText(
          "Please select at least one resource to share (documents, visit pack, medications, or appointments)."
        )
      ).toBeDefined();
    });
  });

  it("3. allows selecting profile and specific resources and confirms creation with one-time link", async () => {
    const mockCreatedResponse = {
      ...sampleShares[0],
      id: "share-3",
      doctor_name: "Dr. Lisa Cuddy",
      access_token: "super-secret-token-1234567890abcdef",
      share_url: "/shared/super-secret-token-1234567890abcdef",
    };
    (createDoctorShare as any).mockResolvedValue(mockCreatedResponse);

    render(
      <DoctorSharing
        token={mockToken}
        activeProfile={sampleProfiles[1]}
        profiles={sampleProfiles}
        documents={sampleDocuments}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Dr. Sarah Jenkins")).toBeDefined();
    });

    fireEvent.click(screen.getByText("➕ New Secure Share"));

    // Fill doctor name
    const nameInput = screen.getByPlaceholderText("e.g. Dr. Sarah Jenkins");
    fireEvent.change(nameInput, { target: { value: "Dr. Lisa Cuddy" } });

    // Check visit pack
    fireEvent.click(screen.getByLabelText(/Doctor Visit Preparation Pack/i));

    // Submit form
    fireEvent.click(screen.getByText("Confirm & Generate Share Link"));

    await waitFor(() => {
      expect(createDoctorShare).toHaveBeenCalledWith(
        mockToken,
        expect.objectContaining({
          doctor_name: "Dr. Lisa Cuddy",
          shared_resources: expect.objectContaining({
            include_visit_pack: true,
          }),
        })
      );
    });

    // Displays one-time link modal
    await waitFor(() => {
      expect(screen.getByText("Secure Doctor Share Link Created!")).toBeDefined();
      expect(screen.getByDisplayValue(/super-secret-token/)).toBeDefined();
    });
  });

  it("4. requires confirmation before revoking a session", async () => {
    (revokeDoctorShare as any).mockResolvedValue({
      ...sampleShares[0],
      status: "revoked",
    });

    render(
      <DoctorSharing
        token={mockToken}
        activeProfile={sampleProfiles[1]}
        profiles={sampleProfiles}
        documents={sampleDocuments}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Dr. Sarah Jenkins")).toBeDefined();
    });

    // Click revoke button for Dr. Sarah Jenkins
    const revokeBtn = screen.getByText("Revoke Access");
    fireEvent.click(revokeBtn);

    // Modal appears
    expect(screen.getByText("Revoke Doctor Access?")).toBeDefined();
    expect(screen.getByText("Yes, Revoke Immediately")).toBeDefined();

    // Confirm revocation
    fireEvent.click(screen.getByText("Yes, Revoke Immediately"));

    await waitFor(() => {
      expect(revokeDoctorShare).toHaveBeenCalledWith(mockToken, "share-1");
    });
  });

  it("5. displays audit trail without leaking secrets", async () => {
    const mockAudit = [
      {
        id: "audit-1",
        session_id: "share-1",
        event_type: "created",
        details: "Created sharing link for Dr. Sarah Jenkins",
        created_at: "2026-10-28T09:00:00Z",
      },
      {
        id: "audit-2",
        session_id: "share-1",
        event_type: "viewed_summary",
        details: "Doctor viewed clinical summary portal",
        ip_address: "192.168.1.10",
        created_at: "2026-10-29T10:30:00Z",
      },
    ];
    (getDoctorShareAudit as any).mockResolvedValue(mockAudit);

    render(
      <DoctorSharing
        token={mockToken}
        activeProfile={sampleProfiles[1]}
        profiles={sampleProfiles}
        documents={sampleDocuments}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Dr. Sarah Jenkins")).toBeDefined();
    });

    // Open audit log
    const auditBtns = screen.getAllByText("Audit Trail");
    fireEvent.click(auditBtns[0]);

    await waitFor(() => {
      expect(screen.getByText(/Security Audit Trail: Dr. Sarah Jenkins/)).toBeDefined();
      expect(screen.getByText("Doctor viewed clinical summary portal")).toBeDefined();
      expect(screen.getByText("IP: 192.168.1.10")).toBeDefined();
    });
  });
});

describe("DoctorSharedPortal Component", () => {
  const samplePortalData: DoctorSharedHealthView = {
    patient_name: "Charlie Child",
    patient_relationship: "child",
    patient_age: 8,
    patient_gender: "male",
    allergies_summary: "Peanuts",
    emergency_contact: "Alpha Parent (+1-555-0101)",
    doctor_name: "Dr. Sarah Jenkins",
    expires_at: "2026-11-05T12:00:00Z",
    status: "active",
    shared_resources: {
      document_ids: ["doc-1"],
      include_visit_pack: true,
      visit_pack_categories: ["documents"],
      include_medications: true,
      include_appointments: false,
    },
    documents: [
      {
        id: "doc-1",
        title: "charlie_blood_test.pdf",
        document_date: "2026-10-25",
        summary: "Processed medical record (1 pages)",
      },
    ],
    medications: [
      {
        id: "med-1",
        name: "Amoxicillin 250mg",
        dosage: "250mg - 5ml",
        frequency: "Twice daily",
        is_active: true,
      },
    ],
    appointments: [],
    has_visit_pack: true,
    notes: "Please review Charlie's CBC counts.",
  };

  it("1. renders authorized clinical summary and download actions", async () => {
    (getSharedHealthPortalView as any).mockResolvedValue(samplePortalData);

    render(<DoctorSharedPortal token="valid-bearer-token" />);

    await waitFor(() => {
      expect(screen.getByText("Charlie Child")).toBeDefined();
      expect(screen.getByText(/Dr\. Sarah Jenkins/)).toBeDefined();
    });

    expect(screen.getByText("Peanuts")).toBeDefined();
    expect(screen.getByText("charlie_blood_test.pdf")).toBeDefined();
    expect(screen.getByText("Amoxicillin 250mg")).toBeDefined();
    expect(screen.getByText("📥 Download Visit Pack PDF")).toBeDefined();
  });

  it("2. renders safe message when link is revoked", async () => {
    const error = new Error("This health sharing link has been revoked by the patient.");
    (error as any).status = 410;
    (getSharedHealthPortalView as any).mockRejectedValue(error);

    render(<DoctorSharedPortal token="revoked-token" />);

    await waitFor(() => {
      expect(screen.getByText("Access Revoked")).toBeDefined();
    });
  });

  it("3. renders safe message when link is expired", async () => {
    const error = new Error("This health sharing link has expired.");
    (error as any).status = 410;
    (getSharedHealthPortalView as any).mockRejectedValue(error);

    render(<DoctorSharedPortal token="expired-token" />);

    await waitFor(() => {
      expect(screen.getByText("Sharing Link Expired")).toBeDefined();
    });
  });
});
