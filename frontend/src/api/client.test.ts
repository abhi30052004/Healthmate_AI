import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ApiError,
  deleteDocument,
  downloadDocument,
  getDocumentText,
  getLive,
  getMe,
  getObservations,
  getReady,
  listDocuments,
  loginUser,
  registerUser,
  reprocessDocument,
  updateObservation,
  uploadDocument,
  verifyDocument,
} from "./client";

afterEach(() => vi.unstubAllGlobals());

describe("api client", () => {
  it("returns liveness payload", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ status: "ok", service: "healthmate-api" }),
      })
    );
    expect((await getLive()).status).toBe("ok");
  });

  it("throws when liveness fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({}) })
    );
    await expect(getLive()).rejects.toThrow();
  });

  it("returns readiness body even on 503", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        json: async () => ({
          status: "unavailable",
          database: false,
          pgvector: false,
        }),
      })
    );
    const r = await getReady();
    expect(r.database).toBe(false);
  });

  it("registers a user successfully", async () => {
    const mockUser = {
      id: "uuid-1234",
      name: "Test User",
      email: "test@example.com",
      is_active: true,
      created_at: "2026-10-27T12:00:00Z",
    };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 201,
        json: async () => mockUser,
      })
    );

    const user = await registerUser({
      name: "Test User",
      email: "test@example.com",
      password: "StrongPassword123!",
    });

    expect(user.email).toBe("test@example.com");
    expect(user.id).toBe("uuid-1234");
  });

  it("throws ApiError with detail message on duplicate registration (409)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 409,
        json: async () => ({ detail: "A user with this email already exists" }),
      })
    );

    await expect(
      registerUser({
        name: "Test User",
        email: "duplicate@example.com",
        password: "StrongPassword123!",
      })
    ).rejects.toThrow("A user with this email already exists");
  });

  it("logs in successfully and returns access token", async () => {
    const mockLoginRes = {
      access_token: "jwt-token-xyz",
      token_type: "bearer",
      expires_in: 900,
      user: {
        id: "uuid-1234",
        name: "Test User",
        email: "test@example.com",
      },
    };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockLoginRes,
      })
    );

    const res = await loginUser({
      email: "test@example.com",
      password: "StrongPassword123!",
    });

    expect(res.access_token).toBe("jwt-token-xyz");
    expect(res.user.email).toBe("test@example.com");
  });

  it("throws ApiError on invalid login credentials (401)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ detail: "Incorrect email or password" }),
      })
    );

    await expect(
      loginUser({
        email: "test@example.com",
        password: "WrongPassword!",
      })
    ).rejects.toThrow("Incorrect email or password");
  });

  it("retrieves current user profile via getMe with bearer token", async () => {
    const mockUser = {
      id: "uuid-1234",
      name: "Test User",
      email: "test@example.com",
      is_active: true,
      created_at: "2026-10-27T12:00:00Z",
    };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockUser,
    });
    vi.stubGlobal("fetch", fetchMock);

    const user = await getMe("jwt-token-xyz");
    expect(user.email).toBe("test@example.com");

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/auth/me"),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer jwt-token-xyz",
        }),
      })
    );
  });

  it("uploads a document successfully", async () => {
    const mockDoc = {
      id: "doc-123",
      owner_id: "user-123",
      filename: "test_report.pdf",
      mime_type: "application/pdf",
      file_size: 1024,
      checksum_sha256: "sha256hash",
      processing_status: "extracted",
      is_verified: false,
      created_at: "2026-10-27T12:00:00Z",
    };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 201,
        json: async () => mockDoc,
      })
    );

    const fakeFile = new File(["dummy pdf content"], "test_report.pdf", {
      type: "application/pdf",
    });
    const doc = await uploadDocument("jwt-token-xyz", fakeFile);
    expect(doc.id).toBe("doc-123");
    expect(doc.processing_status).toBe("extracted");
  });

  it("lists documents for authenticated user", async () => {
    const mockList = [
      {
        id: "doc-1",
        owner_id: "user-123",
        filename: "report1.pdf",
        mime_type: "application/pdf",
        file_size: 2048,
        checksum_sha256: "sha1",
        processing_status: "extracted",
        is_verified: true,
        created_at: "2026-10-27T12:00:00Z",
      },
    ];
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockList,
      })
    );

    const docs = await listDocuments("jwt-token-xyz");
    expect(docs.length).toBe(1);
    expect(docs[0].filename).toBe("report1.pdf");
  });

  it("retrieves extracted text for document", async () => {
    const mockText = {
      document_id: "doc-1",
      filename: "report1.pdf",
      processing_status: "extracted",
      page_count: 1,
      extracted_text: "Hemoglobin: 13.2 g/dL",
      is_verified: false,
    };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockText,
      })
    );

    const textRes = await getDocumentText("jwt-token-xyz", "doc-1");
    expect(textRes.extracted_text).toBe("Hemoglobin: 13.2 g/dL");
  });

  it("verifies a document successfully", async () => {
    const mockVerify = {
      document_id: "doc-1",
      is_verified: true,
      verified_at: "2026-10-27T12:30:00Z",
      message: "Extracted document content confirmed by user.",
    };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockVerify,
      })
    );

    const res = await verifyDocument("jwt-token-xyz", "doc-1");
    expect(res.is_verified).toBe(true);
  });

  it("deletes a document successfully", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 204,
    });
    vi.stubGlobal("fetch", fetchMock);

    await deleteDocument("jwt-token-xyz", "doc-1");
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/documents/doc-1"),
      expect.objectContaining({ method: "DELETE" })
    );
  });

  it("downloads a document and triggers browser download", async () => {
    const mockBlob = new Blob(["sample pdf bytes"], { type: "application/pdf" });
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      blob: async () => mockBlob,
    });
    vi.stubGlobal("fetch", fetchMock);

    const createObjectURLMock = vi.fn().mockReturnValue("blob:http://localhost/test-blob");
    const revokeObjectURLMock = vi.fn();
    const clickMock = vi.fn();
    window.URL.createObjectURL = createObjectURLMock;
    window.URL.revokeObjectURL = revokeObjectURLMock;
    const originalClick = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = clickMock;

    try {
      await downloadDocument("jwt-token-xyz", "doc-123", "lab_report.pdf");

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/api/documents/doc-123/download"),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "Bearer jwt-token-xyz",
          }),
        })
      );
      expect(createObjectURLMock).toHaveBeenCalledWith(mockBlob);
      expect(clickMock).toHaveBeenCalled();
      expect(revokeObjectURLMock).toHaveBeenCalledWith("blob:http://localhost/test-blob");
    } finally {
      HTMLAnchorElement.prototype.click = originalClick;
    }
  });

  it("fetches structured observations for a document", async () => {
    const mockObs = [
      {
        id: "obs-1",
        document_id: "doc-1",
        owner_id: "user-1",
        test_name: "Hemoglobin",
        value: "13.2",
        numeric_value: 13.2,
        unit: "g/dL",
        reference_range: "13.5-17.5",
        flag: "LOW",
        source_page: 1,
        source_text: "Hemoglobin 13.2 g/dL 13.5-17.5",
        is_low_confidence: false,
        is_reviewed: false,
        created_at: "2026-10-28T00:00:00Z",
      },
    ];
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockObs,
      })
    );

    const result = await getObservations("jwt-token-xyz", "doc-1");
    expect(result).toHaveLength(1);
    expect(result[0].test_name).toBe("Hemoglobin");
    expect(result[0].flag).toBe("LOW");
  });

  it("updates an observation with user correction", async () => {
    const mockUpdated = {
      id: "obs-1",
      document_id: "doc-1",
      owner_id: "user-1",
      test_name: "Hemoglobin",
      value: "14.0",
      numeric_value: 14.0,
      unit: "g/dL",
      reference_range: "13.5-17.5",
      flag: "NORMAL",
      source_page: 1,
      source_text: "Hemoglobin 13.2 g/dL",
      is_low_confidence: false,
      is_reviewed: true,
      created_at: "2026-10-28T00:00:00Z",
    };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockUpdated,
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await updateObservation("jwt-token-xyz", "doc-1", "obs-1", {
      value: "14.0",
      is_reviewed: true,
    });
    expect(result.value).toBe("14.0");
    expect(result.is_reviewed).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/documents/doc-1/observations/obs-1"),
      expect.objectContaining({ method: "PUT" })
    );
  });

  it("triggers document reprocessing", async () => {
    const mockReprocessed = {
      id: "doc-1",
      owner_id: "user-1",
      filename: "report.png",
      mime_type: "image/png",
      file_size: 50000,
      checksum_sha256: "abc",
      processing_status: "extracted",
      ocr_applied: true,
      is_verified: false,
      created_at: "2026-10-28T00:00:00Z",
      observations: [],
    };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockReprocessed,
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await reprocessDocument("jwt-token-xyz", "doc-1");
    expect(result.processing_status).toBe("extracted");
    expect(result.ocr_applied).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/documents/doc-1/reprocess"),
      expect.objectContaining({ method: "POST" })
    );
  });
});
