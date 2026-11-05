const BASE =
  import.meta.env.VITE_API_BASE_URL ??
  import.meta.env.VITE_API_URL ??
  "http://127.0.0.1:8000";

export interface ReadyStatus {
  status: string;
  database: boolean;
  pgvector: boolean;
  error?: string;
}

export interface LiveStatus {
  status: string;
  service: string;
}

import {
  authService,
  tokenStorage,
  getApiBaseUrl,
  ApiError,
  registerUser,
  loginUser,
  getMe,
  type User,
  type UserLoginSummary,
  type RegisterRequest,
  type LoginRequest,
  type LoginResponse,
  type TokenResponse,
} from "../services/authService";

export {
  authService,
  tokenStorage,
  getApiBaseUrl,
  ApiError,
  registerUser,
  loginUser,
  getMe,
  type User,
  type UserLoginSummary,
  type RegisterRequest,
  type LoginRequest,
  type LoginResponse,
  type TokenResponse,
};

export interface ObservationItem {
  id: string;
  document_id: string;
  owner_id: string;
  test_name: string;
  value: string;
  numeric_value?: number | null;
  unit?: string | null;
  reference_range?: string | null;
  flag?: "HIGH" | "LOW" | "NORMAL" | "ABNORMAL" | string | null;
  source_page: number;
  source_text: string;
  is_low_confidence: boolean;
  is_reviewed: boolean;
  created_at: string;
  updated_at?: string | null;
}

export interface ObservationUpdatePayload {
  test_name?: string;
  value?: string;
  numeric_value?: number | null;
  unit?: string;
  reference_range?: string;
  flag?: string | null;
  is_reviewed?: boolean;
}

export interface DocumentItem {
  id: string;
  owner_id: string;
  filename: string;
  mime_type: string;
  file_size: number;
  checksum_sha256: string;
  processing_status:
    | "uploaded"
    | "queued"
    | "processing"
    | "completed"
    | "extracted"
    | "ocr_required"
    | "failed"
    | string;
  error_message?: string | null;
  page_count?: number | null;
  ocr_applied?: boolean;
  extracted_text?: string | null;
  patient_name?: string | null;
  document_date?: string | null;
  lab_name?: string | null;
  is_verified: boolean;
  verified_at?: string | null;
  profile_id?: string | null;
  created_at: string;
  updated_at?: string | null;
  observations?: ObservationItem[];
}

export interface DocumentText {
  document_id: string;
  filename: string;
  processing_status: string;
  page_count?: number | null;
  ocr_applied?: boolean;
  extracted_text?: string | null;
  is_verified: boolean;
  verified_at?: string | null;
}

export interface DocumentVerifyResponse {
  document_id: string;
  is_verified: boolean;
  verified_at: string;
  observations_verified_count?: number;
  message: string;
}

async function parseErrorMessage(res: Response): Promise<string> {
  try {
    const data = await res.json();
    if (typeof data.detail === "string") {
      return data.detail;
    }
    if (Array.isArray(data.detail) && data.detail.length > 0) {
      return data.detail.map((d: { msg?: string }) => d.msg ?? "Validation error").join(", ");
    }
  } catch {
    // If not JSON, fall through
  }
  return `Request failed with status ${res.status}`;
}

export async function getLive(): Promise<LiveStatus> {
  const res = await fetch(`${BASE}/health/live`);
  if (!res.ok) throw new ApiError(res.status, `Liveness failed: ${res.status}`);
  return res.json();
}

// /health/ready returns 503 with a useful JSON body, so don't throw on non-2xx.
export async function getReady(): Promise<ReadyStatus> {
  const res = await fetch(`${BASE}/health/ready`);
  return res.json();
}

export async function uploadDocument(
  token: string,
  file: File,
  onProgress?: (percent: number) => void,
  profileId?: string
): Promise<DocumentItem> {
  const formData = new FormData();
  formData.append("file", file);
  if (profileId) {
    formData.append("profile_id", profileId);
  }

  // If XMLHttpRequest is available (browser), use it for real upload progress
  if (typeof XMLHttpRequest !== "undefined" && onProgress) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", `${BASE}/api/documents`);
      xhr.setRequestHeader("Authorization", `Bearer ${token}`);

      if (xhr.upload) {
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100);
            onProgress(percent);
          }
        };
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            resolve(JSON.parse(xhr.responseText));
          } catch {
            reject(new ApiError(xhr.status, "Invalid response from server."));
          }
        } else {
          let message = `Request failed with status ${xhr.status}`;
          try {
            const data = JSON.parse(xhr.responseText);
            if (typeof data.detail === "string") {
              message = data.detail;
            } else if (Array.isArray(data.detail)) {
              message = data.detail
                .map((d: { msg?: string }) => d.msg ?? "Validation error")
                .join(", ");
            }
          } catch {
            // Non-JSON
          }
          reject(new ApiError(xhr.status, message));
        }
      };

      xhr.onerror = () => {
        reject(
          new ApiError(
            0,
            "Unable to connect to the server. Please check your network connection."
          )
        );
      };

      xhr.send(formData);
    });
  }

  // Standard fetch implementation
  const res = await fetch(`${BASE}/api/documents`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  if (!res.ok) {
    const message = await parseErrorMessage(res);
    throw new ApiError(res.status, message);
  }

  return res.json();
}

export async function downloadDocument(
  token: string,
  id: string,
  filename: string
): Promise<void> {
  const res = await fetch(`${BASE}/api/documents/${id}/download`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const message = await parseErrorMessage(res);
    throw new ApiError(res.status, message);
  }

  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = window.document.createElement("a");
  a.href = url;
  a.download = filename;
  window.document.body.appendChild(a);
  a.click();
  window.document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

export async function listDocuments(token: string, profileId?: string): Promise<DocumentItem[]> {
  const url = profileId
    ? `${BASE}/api/documents?profile_id=${encodeURIComponent(profileId)}`
    : `${BASE}/api/documents`;
  const res = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    const message = await parseErrorMessage(res);
    throw new ApiError(res.status, message);
  }

  return res.json();
}

export async function getDocument(token: string, id: string): Promise<DocumentItem> {
  const res = await fetch(`${BASE}/api/documents/${id}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    const message = await parseErrorMessage(res);
    throw new ApiError(res.status, message);
  }

  return res.json();
}

export async function getDocumentText(token: string, id: string): Promise<DocumentText> {
  const res = await fetch(`${BASE}/api/documents/${id}/text`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    const message = await parseErrorMessage(res);
    throw new ApiError(res.status, message);
  }

  return res.json();
}

export async function getObservations(token: string, documentId: string): Promise<ObservationItem[]> {
  const res = await fetch(`${BASE}/api/documents/${documentId}/observations`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    const message = await parseErrorMessage(res);
    throw new ApiError(res.status, message);
  }

  return res.json();
}

export async function updateObservation(
  token: string,
  documentId: string,
  observationId: string,
  payload: ObservationUpdatePayload
): Promise<ObservationItem> {
  const res = await fetch(`${BASE}/api/documents/${documentId}/observations/${observationId}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const message = await parseErrorMessage(res);
    throw new ApiError(res.status, message);
  }

  return res.json();
}

export async function reprocessDocument(token: string, documentId: string): Promise<DocumentItem> {
  const res = await fetch(`${BASE}/api/documents/${documentId}/reprocess`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    const message = await parseErrorMessage(res);
    throw new ApiError(res.status, message);
  }

  return res.json();
}

export async function verifyDocument(
  token: string,
  id: string
): Promise<DocumentVerifyResponse> {
  const res = await fetch(`${BASE}/api/documents/${id}/verify`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    const message = await parseErrorMessage(res);
    throw new ApiError(res.status, message);
  }

  return res.json();
}

export async function deleteDocument(token: string, id: string): Promise<void> {
  const res = await fetch(`${BASE}/api/documents/${id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const message = await parseErrorMessage(res);
    throw new ApiError(res.status, message);
  }
}

// ---------------------------------------------------------------------------
// Medical Timeline & Trend Interfaces & Functions
// ---------------------------------------------------------------------------

export interface TimelineItem {
  id: string;
  document_id: string;
  document_filename: string;
  clinical_date: string;
  date_type: "actual" | "inferred";
  lab_name?: string | null;
  patient_name?: string | null;
  original_test_name: string;
  normalized_test_name: string;
  category: string;
  value: string;
  numeric_value?: number | null;
  unit?: string | null;
  reference_range?: string | null;
  flag?: "HIGH" | "LOW" | "NORMAL" | "ABNORMAL" | string | null;
  source_page: number;
  source_text: string;
  is_reviewed: boolean;
  is_low_confidence: boolean;
  created_at: string;
}

export interface TimelineResponse {
  items: TimelineItem[];
  total: number;
  limit: number;
  offset: number;
}

export interface TrendPoint {
  observation_id: string;
  document_id: string;
  document_filename: string;
  date: string;
  date_type: "actual" | "inferred";
  value: string;
  numeric_value: number;
  original_unit?: string | null;
  standardized_numeric_value: number;
  reference_range?: string | null;
  flag?: string | null;
  is_reviewed: boolean;
  source_page: number;
  source_text: string;
}

export interface TrendSeries {
  normalized_test_name: string;
  category: string;
  standard_unit: string;
  points: TrendPoint[];
  has_multiple_points: boolean;
  has_converted_units: boolean;
  warning_message?: string | null;
}

export interface TrendResponse {
  series: TrendSeries[];
}

export interface RepeatedTestMetric {
  normalized_test_name: string;
  category: string;
  count: number;
  dates: string[];
  unit?: string | null;
  earliest_value: string;
  latest_value: string;
  trajectory_summary: string;
}

export interface TimelineSummaryResponse {
  total_reports: number;
  total_observations: number;
  reviewed_observations_count: number;
  unverified_observations_count: number;
  earliest_date?: string | null;
  latest_date?: string | null;
  categories: string[];
  repeated_tests: RepeatedTestMetric[];
  abnormal_findings_count: number;
}

export interface TimelineFilterParams {
  include_unverified?: boolean;
  start_date?: string;
  end_date?: string;
  test_name?: string;
  category?: string;
  profile_id?: string;
  limit?: number;
  offset?: number;
}

export async function getTimeline(
  token: string,
  params: TimelineFilterParams = {}
): Promise<TimelineResponse> {
  const query = new URLSearchParams();
  if (params.include_unverified !== undefined) {
    query.set("include_unverified", String(params.include_unverified));
  }
  if (params.start_date) query.set("start_date", params.start_date);
  if (params.end_date) query.set("end_date", params.end_date);
  if (params.test_name) query.set("test_name", params.test_name);
  if (params.category) query.set("category", params.category);
  if (params.profile_id) query.set("profile_id", params.profile_id);
  if (params.limit !== undefined) query.set("limit", String(params.limit));
  if (params.offset !== undefined) query.set("offset", String(params.offset));

  const url = `${BASE}/api/timeline${query.toString() ? `?${query.toString()}` : ""}`;
  const res = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    const message = await parseErrorMessage(res);
    throw new ApiError(res.status, message);
  }

  return res.json();
}

export async function getTimelineTrends(
  token: string,
  params: {
    include_unverified?: boolean;
    test_name?: string;
    category?: string;
    profile_id?: string;
  } = {}
): Promise<TrendResponse> {
  const query = new URLSearchParams();
  if (params.include_unverified !== undefined) {
    query.set("include_unverified", String(params.include_unverified));
  }
  if (params.test_name) query.set("test_name", params.test_name);
  if (params.category) query.set("category", params.category);
  if (params.profile_id) query.set("profile_id", params.profile_id);

  const url = `${BASE}/api/timeline/trends${query.toString() ? `?${query.toString()}` : ""}`;
  const res = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    const message = await parseErrorMessage(res);
    throw new ApiError(res.status, message);
  }

  return res.json();
}

export async function getTimelineSummary(
  token: string,
  include_unverified?: boolean,
  profile_id?: string
): Promise<TimelineSummaryResponse> {
  const query = new URLSearchParams();
  if (include_unverified !== undefined) {
    query.set("include_unverified", String(include_unverified));
  }
  if (profile_id) {
    query.set("profile_id", profile_id);
  }

  const url = `${BASE}/api/timeline/summary${query.toString() ? `?${query.toString()}` : ""}`;
  const res = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    const message = await parseErrorMessage(res);
    throw new ApiError(res.status, message);
  }

  return res.json();
}

// ---------------------------------------------------------------------------
// Medical Chat & RAG Interfaces & Functions
// ---------------------------------------------------------------------------

export interface CitationItem {
  citation_id: string;
  document_id: string;
  document_title: string;
  observation_id?: string | null;
  original_test_name?: string | null;
  normalized_test_name?: string | null;
  value?: string | null;
  unit?: string | null;
  reference_range?: string | null;
  abnormal_flag?: string | null;
  clinical_date?: string | null;
  date_type: "actual" | "inferred";
  page_number?: number | null;
  source_text?: string | null;
  is_reviewed: boolean;
  relevance_score?: number | null;
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  role: "user" | "assistant";
  content: string;
  citations?: CitationItem[] | null;
  created_at: string;
}

export interface ChatConversationSummary {
  id: string;
  owner_id: string;
  title: string;
  created_at: string;
  updated_at: string;
  message_count: number;
}

export interface ChatConversationDetail {
  id: string;
  owner_id: string;
  title: string;
  created_at: string;
  updated_at: string;
  messages: ChatMessage[];
}

export interface ChatAnswerResponse {
  conversation_id: string;
  message_id: string;
  answer: string;
  citations: CitationItem[];
  retrieval_metadata?: Record<string, unknown>;
}

export async function createConversation(
  token: string,
  title?: string
): Promise<ChatConversationSummary> {
  const res = await fetch(`${BASE}/api/medical-chat/conversations`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(title ? { title } : {}),
  });

  if (!res.ok) {
    const message = await parseErrorMessage(res);
    throw new ApiError(res.status, message);
  }

  return res.json();
}

export async function listConversations(
  token: string
): Promise<ChatConversationSummary[]> {
  const res = await fetch(`${BASE}/api/medical-chat/conversations`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    const message = await parseErrorMessage(res);
    throw new ApiError(res.status, message);
  }

  return res.json();
}

export async function getConversation(
  token: string,
  conversationId: string
): Promise<ChatConversationDetail> {
  const res = await fetch(
    `${BASE}/api/medical-chat/conversations/${conversationId}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    }
  );

  if (!res.ok) {
    const message = await parseErrorMessage(res);
    throw new ApiError(res.status, message);
  }

  return res.json();
}

export async function sendChatMessage(
  token: string,
  conversationId: string,
  message: string,
  includeUnverified: boolean = false
): Promise<ChatAnswerResponse> {
  const res = await fetch(
    `${BASE}/api/medical-chat/conversations/${conversationId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message,
        include_unverified: includeUnverified,
      }),
    }
  );

  if (!res.ok) {
    const message = await parseErrorMessage(res);
    throw new ApiError(res.status, message);
  }

  return res.json();
}

export async function deleteConversation(
  token: string,
  conversationId: string
): Promise<void> {
  const res = await fetch(
    `${BASE}/api/medical-chat/conversations/${conversationId}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!res.ok) {
    const message = await parseErrorMessage(res);
    throw new ApiError(res.status, message);
  }
}

// -------------------------------------------------------------
// Phase 7: Medical Insights & Personalized Health Summary
// -------------------------------------------------------------

export interface InsightsOverviewMetrics {
  total_reports: number;
  verified_observations_count: number;
  unverified_observations_count: number;
  distinct_test_types_count: number;
  earliest_date: string | null;
  latest_date: string | null;
  reports_with_missing_dates_count: number;
  observations_missing_units_count: number;
  observations_missing_ranges_count: number;
  comparable_tests_with_history_count: number;
  noteworthy_findings_count: number;
}

export type ReferenceClassification =
  | "below_reference"
  | "within_reference"
  | "above_reference"
  | "qualitative_flagged"
  | "unknown";

export interface FindingItem {
  observation_id: string;
  document_id: string;
  document_title: string;
  test_name: string;
  normalized_test_name: string;
  category: string;
  value: string;
  numeric_value: number | null;
  unit: string | null;
  reference_range: string | null;
  lab_flag: string | null;
  clinical_date: string;
  date_provenance: "actual" | "inferred";
  is_verified: boolean;
  source_page: number | null;
  source_text: string | null;
  classification: ReferenceClassification;
  classification_explanation: string;
  requires_review: boolean;
  discrepancy_explanation: string | null;
}

export interface FindingsResponse {
  total: number;
  items: FindingItem[];
}

export interface LongitudinalTrendItem {
  test_name: string;
  normalized_test_name: string;
  category: string;
  standard_unit: string;
  has_converted_units: boolean;
  previous_value: string;
  previous_standard_value: number | null;
  previous_date: string;
  previous_document_id: string;
  previous_document_title: string;
  previous_is_verified: boolean;
  latest_value: string;
  latest_standard_value: number | null;
  latest_date: string;
  latest_document_id: string;
  latest_document_title: string;
  latest_is_verified: boolean;
  absolute_change: number | null;
  percentage_change: number | null;
  direction: "increased" | "decreased" | "stable";
  clinical_change_description: string;
}

export interface LongitudinalTrendsResponse {
  total: number;
  items: LongitudinalTrendItem[];
}

export interface DataQualityIssue {
  issue_type: string;
  severity: "low" | "medium" | "high";
  document_id: string;
  document_title: string;
  observation_id: string | null;
  test_name: string | null;
  description: string;
  recommendation: string;
}

export interface DataQualityReport {
  total_issues: number;
  missing_dates_count: number;
  inferred_dates_count: number;
  missing_units_count: number;
  missing_ranges_count: number;
  unverified_observations_count: number;
  flag_discrepancies_count: number;
  issues: DataQualityIssue[];
}

export interface PersonalizedHealthSummary {
  summary_mode: "offline" | "llm_assisted";
  narrative_summary: string;
  key_findings: string[];
  longitudinal_highlights: string[];
  data_quality_disclosures: string[];
  suggested_clinician_questions: string[];
  citations: CitationItem[];
  medical_disclaimer: string;
}

export async function getInsightsOverview(
  token: string
): Promise<InsightsOverviewMetrics> {
  const res = await fetch(`${BASE}/api/medical-insights/overview`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const message = await parseErrorMessage(res);
    throw new ApiError(res.status, message);
  }

  return res.json();
}

export async function getInsightsFindings(
  token: string,
  params?: {
    startDate?: string;
    endDate?: string;
    category?: string;
    testName?: string;
    classification?: string;
    includeUnverified?: boolean;
    limit?: number;
    offset?: number;
  }
): Promise<FindingsResponse> {
  const url = new URL(`${BASE}/api/medical-insights/findings`);
  if (params?.startDate) url.searchParams.set("start_date", params.startDate);
  if (params?.endDate) url.searchParams.set("end_date", params.endDate);
  if (params?.category) url.searchParams.set("category", params.category);
  if (params?.testName) url.searchParams.set("test_name", params.testName);
  if (params?.classification)
    url.searchParams.set("classification", params.classification);
  if (params?.includeUnverified !== undefined)
    url.searchParams.set(
      "include_unverified",
      String(params.includeUnverified)
    );
  if (params?.limit !== undefined)
    url.searchParams.set("limit", String(params.limit));
  if (params?.offset !== undefined)
    url.searchParams.set("offset", String(params.offset));

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const message = await parseErrorMessage(res);
    throw new ApiError(res.status, message);
  }

  return res.json();
}

export async function getInsightsTrends(
  token: string,
  includeUnverified: boolean = false
): Promise<LongitudinalTrendsResponse> {
  const url = new URL(`${BASE}/api/medical-insights/trends`);
  if (includeUnverified) {
    url.searchParams.set("include_unverified", "true");
  }

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const message = await parseErrorMessage(res);
    throw new ApiError(res.status, message);
  }

  return res.json();
}

export async function getInsightsSummary(
  token: string,
  mode: "offline" | "llm_assisted" = "offline"
): Promise<PersonalizedHealthSummary> {
  const url = new URL(`${BASE}/api/medical-insights/summary`);
  url.searchParams.set("mode", mode);

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const message = await parseErrorMessage(res);
    throw new ApiError(res.status, message);
  }

  return res.json();
}

export async function getInsightsDataQuality(
  token: string
): Promise<DataQualityReport> {
  const res = await fetch(`${BASE}/api/medical-insights/data-quality`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const message = await parseErrorMessage(res);
    throw new ApiError(res.status, message);
  }

  return res.json();
}

// ---------------------------------------------------------------------------
// Phase 8: Medical Report Comparison & Export Center
// ---------------------------------------------------------------------------

export interface ComparisonReportMeta {
  document_id: string;
  filename: string;
  clinical_date: string | null;
  date_provenance: "explicit" | "inferred" | "unknown";
  laboratory_name?: string | null;
  total_observations: number;
}

export interface ReportComparisonItem {
  test_name: string;
  normalized_test_name: string;
  category: string;
  classification:
    | "unchanged"
    | "increased"
    | "decreased"
    | "new"
    | "not_found"
    | "incompatible_units"
    | "needs_review"
    | "qualitative_changed";
  classification_label: string;
  baseline_value: string | null;
  baseline_unit: string | null;
  baseline_numeric: number | null;
  baseline_reference_range: string | null;
  baseline_flag: string | null;
  baseline_date: string | null;
  baseline_document_id: string | null;
  baseline_document_title: string | null;
  baseline_page: number | null;
  baseline_source_text: string | null;
  baseline_is_verified: boolean | null;
  newer_value: string | null;
  newer_unit: string | null;
  newer_numeric: number | null;
  newer_reference_range: string | null;
  newer_flag: string | null;
  newer_date: string | null;
  newer_document_id: string | null;
  newer_document_title: string | null;
  newer_page: number | null;
  newer_source_text: string | null;
  newer_is_verified: boolean | null;
  standard_unit: string | null;
  has_converted_units: boolean;
  absolute_change: number | null;
  percentage_change: number | null;
  clinical_change_description: string;
  requires_review: boolean;
  review_explanation: string | null;
}

export interface ComparisonSummaryMetrics {
  total_comparisons: number;
  increased_count: number;
  decreased_count: number;
  unchanged_count: number;
  new_tests_count: number;
  missing_tests_count: number;
  incompatible_units_count: number;
  needs_review_count: number;
  unverified_count: number;
}

export interface ReportComparisonResponse {
  baseline_report: ComparisonReportMeta;
  newer_report: ComparisonReportMeta;
  additional_reports: ComparisonReportMeta[];
  summary: ComparisonSummaryMetrics;
  items: ReportComparisonItem[];
  warnings: string[];
  disclaimer: string;
}

export interface ReportComparisonRequest {
  document_ids: string[];
  include_unverified?: boolean;
  ordering_preference?: "date_asc" | "date_desc" | "selection_order";
}

export async function compareReports(
  token: string,
  payload: ReportComparisonRequest
): Promise<ReportComparisonResponse> {
  const res = await fetch(`${BASE}/api/report-comparison`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const message = await parseErrorMessage(res);
    throw new ApiError(res.status, message);
  }

  return res.json();
}

export async function downloadPdfHealthReport(
  token: string,
  params?: {
    startDate?: string;
    endDate?: string;
    includeUnverified?: boolean;
    sections?: string[];
  }
): Promise<string> {
  const url = new URL(`${BASE}/api/medical-insights/export/pdf`);
  if (params?.startDate) url.searchParams.set("start_date", params.startDate);
  if (params?.endDate) url.searchParams.set("end_date", params.endDate);
  if (params?.includeUnverified) url.searchParams.set("include_unverified", "true");
  if (params?.sections && params.sections.length > 0) {
    params.sections.forEach((s) => url.searchParams.append("sections", s));
  }

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const message = await parseErrorMessage(res);
    throw new ApiError(res.status, message);
  }

  const disposition = res.headers.get("content-disposition");
  let filename = "HealthMate_Medical_Report.pdf";
  if (disposition && disposition.includes("filename=")) {
    const match = disposition.match(/filename=["']?([^"';]+)["']?/);
    if (match && match[1]) filename = match[1];
  }

  const blob = await res.blob();
  const blobUrl = window.URL.createObjectURL(blob);
  const a = window.document.createElement("a");
  a.href = blobUrl;
  a.download = filename;
  window.document.body.appendChild(a);
  a.click();
  window.document.body.removeChild(a);
  window.URL.revokeObjectURL(blobUrl);

  return filename;
}

export async function downloadCsvObservations(
  token: string,
  params?: {
    startDate?: string;
    endDate?: string;
    includeUnverified?: boolean;
  }
): Promise<string> {
  const url = new URL(`${BASE}/api/medical-insights/export/csv`);
  if (params?.startDate) url.searchParams.set("start_date", params.startDate);
  if (params?.endDate) url.searchParams.set("end_date", params.endDate);
  if (params?.includeUnverified) url.searchParams.set("include_unverified", "true");

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const message = await parseErrorMessage(res);
    throw new ApiError(res.status, message);
  }

  const disposition = res.headers.get("content-disposition");
  let filename = "HealthMate_Observations.csv";
  if (disposition && disposition.includes("filename=")) {
    const match = disposition.match(/filename=["']?([^"';]+)["']?/);
    if (match && match[1]) filename = match[1];
  }

  const blob = await res.blob();
  const blobUrl = window.URL.createObjectURL(blob);
  const a = window.document.createElement("a");
  a.href = blobUrl;
  a.download = filename;
  window.document.body.appendChild(a);
  a.click();
  window.document.body.removeChild(a);
  window.URL.revokeObjectURL(blobUrl);

  return filename;
}

// ---------------------------------------------------------------------------
// Phase 9: Medication Organizer, Appointment Tracker & Care Follow-Up Planner
// ---------------------------------------------------------------------------

export interface MedicationRecord {
  id: string;
  user_id: string;
  name: string;
  medication_type?: string | null;
  strength?: string | null;
  dosage_instructions?: string | null;
  route?: string | null;
  frequency?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  prescriber?: string | null;
  pharmacy?: string | null;
  notes?: string | null;
  source_document_id?: string | null;
  source_document_title?: string | null;
  status: "active" | "paused" | "completed" | "archived";
  created_at: string;
  updated_at: string;
}

export interface MedicationCreate {
  name: string;
  medication_type?: string | null;
  strength?: string | null;
  dosage_instructions?: string | null;
  route?: string | null;
  frequency?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  prescriber?: string | null;
  pharmacy?: string | null;
  notes?: string | null;
  source_document_id?: string | null;
  status?: "active" | "paused" | "completed" | "archived";
}

export interface MedicationUpdate {
  name?: string | null;
  medication_type?: string | null;
  strength?: string | null;
  dosage_instructions?: string | null;
  route?: string | null;
  frequency?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  prescriber?: string | null;
  pharmacy?: string | null;
  notes?: string | null;
  source_document_id?: string | null;
  status?: "active" | "paused" | "completed" | "archived" | null;
}

export interface AppointmentRecord {
  id: string;
  user_id: string;
  title: string;
  appointment_type?: string | null;
  provider_name?: string | null;
  location?: string | null;
  scheduled_at: string;
  timezone?: string | null;
  status: "scheduled" | "completed" | "cancelled" | "rescheduled";
  notes?: string | null;
  source_document_id?: string | null;
  source_document_title?: string | null;
  follow_up_tasks_count: number;
  created_at: string;
  updated_at: string;
}

export interface AppointmentCreate {
  title: string;
  appointment_type?: string | null;
  provider_name?: string | null;
  location?: string | null;
  scheduled_at: string;
  timezone?: string | null;
  status?: "scheduled" | "completed" | "cancelled" | "rescheduled";
  notes?: string | null;
  source_document_id?: string | null;
}

export interface AppointmentUpdate {
  title?: string | null;
  appointment_type?: string | null;
  provider_name?: string | null;
  location?: string | null;
  scheduled_at?: string | null;
  timezone?: string | null;
  status?: "scheduled" | "completed" | "cancelled" | "rescheduled" | null;
  notes?: string | null;
  source_document_id?: string | null;
}

export interface FollowUpTask {
  id: string;
  user_id: string;
  title: string;
  description?: string | null;
  due_at?: string | null;
  status: "pending" | "completed" | "dismissed";
  priority: "low" | "medium" | "high";
  source_document_id?: string | null;
  source_document_title?: string | null;
  appointment_id?: string | null;
  appointment_title?: string | null;
  is_overdue: boolean;
  created_at: string;
  updated_at: string;
}

export interface FollowUpTaskCreate {
  title: string;
  description?: string | null;
  due_at?: string | null;
  status?: "pending" | "completed" | "dismissed";
  priority?: "low" | "medium" | "high";
  source_document_id?: string | null;
  appointment_id?: string | null;
}

export interface FollowUpTaskUpdate {
  title?: string | null;
  description?: string | null;
  due_at?: string | null;
  status?: "pending" | "completed" | "dismissed" | null;
  priority?: "low" | "medium" | "high" | null;
  source_document_id?: string | null;
  appointment_id?: string | null;
}

export interface CareCalendarItem {
  id: string;
  item_type: "appointment" | "follow_up";
  title: string;
  scheduled_or_due_at: string;
  timezone?: string | null;
  status: string;
  priority?: string | null;
  provider_or_location?: string | null;
  description_or_notes?: string | null;
  appointment_id?: string | null;
  source_document_id?: string | null;
  source_document_title?: string | null;
}

export interface CareCalendarResponse {
  start_date?: string | null;
  end_date?: string | null;
  items: CareCalendarItem[];
  total: number;
}

export interface CareOverviewResponse {
  active_medications_count: number;
  upcoming_appointments_count: number;
  pending_follow_ups_count: number;
  overdue_follow_ups_count: number;
  upcoming_appointments: AppointmentRecord[];
  pending_tasks: FollowUpTask[];
  active_medications: MedicationRecord[];
  disclaimer: string;
}

// API methods

export async function getCareOverview(token: string): Promise<CareOverviewResponse> {
  const res = await fetch(`${BASE}/api/care/overview`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const msg = await parseErrorMessage(res);
    throw new ApiError(res.status, msg);
  }
  return res.json();
}

export async function getCareCalendar(
  token: string,
  params?: { startDate?: string; endDate?: string }
): Promise<CareCalendarResponse> {
  const url = new URL(`${BASE}/api/care/calendar`);
  if (params?.startDate) url.searchParams.set("start_date", params.startDate);
  if (params?.endDate) url.searchParams.set("end_date", params.endDate);

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const msg = await parseErrorMessage(res);
    throw new ApiError(res.status, msg);
  }
  return res.json();
}

export async function listMedications(
  token: string,
  params?: { status?: string; search?: string; profile_id?: string }
): Promise<MedicationRecord[]> {
  const url = new URL(`${BASE}/api/care/medications`);
  if (params?.status) url.searchParams.set("status", params.status);
  if (params?.search) url.searchParams.set("search", params.search);
  if (params?.profile_id) url.searchParams.set("profile_id", params.profile_id);

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const msg = await parseErrorMessage(res);
    throw new ApiError(res.status, msg);
  }
  return res.json();
}

export async function createMedication(
  token: string,
  data: MedicationCreate
): Promise<MedicationRecord> {
  const res = await fetch(`${BASE}/api/care/medications`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const msg = await parseErrorMessage(res);
    throw new ApiError(res.status, msg);
  }
  return res.json();
}

export async function getMedication(token: string, id: string): Promise<MedicationRecord> {
  const res = await fetch(`${BASE}/api/care/medications/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const msg = await parseErrorMessage(res);
    throw new ApiError(res.status, msg);
  }
  return res.json();
}

export async function updateMedication(
  token: string,
  id: string,
  data: MedicationUpdate
): Promise<MedicationRecord> {
  const res = await fetch(`${BASE}/api/care/medications/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const msg = await parseErrorMessage(res);
    throw new ApiError(res.status, msg);
  }
  return res.json();
}

export async function deleteMedication(token: string, id: string): Promise<void> {
  const res = await fetch(`${BASE}/api/care/medications/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const msg = await parseErrorMessage(res);
    throw new ApiError(res.status, msg);
  }
}

export async function listAppointments(
  token: string,
  params?: { status?: string; startDate?: string; endDate?: string; profile_id?: string }
): Promise<AppointmentRecord[]> {
  const url = new URL(`${BASE}/api/care/appointments`);
  if (params?.status) url.searchParams.set("status", params.status);
  if (params?.startDate) url.searchParams.set("start_date", params.startDate);
  if (params?.endDate) url.searchParams.set("end_date", params.endDate);
  if (params?.profile_id) url.searchParams.set("profile_id", params.profile_id);

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const msg = await parseErrorMessage(res);
    throw new ApiError(res.status, msg);
  }
  return res.json();
}

export async function createAppointment(
  token: string,
  data: AppointmentCreate
): Promise<AppointmentRecord> {
  const res = await fetch(`${BASE}/api/care/appointments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const msg = await parseErrorMessage(res);
    throw new ApiError(res.status, msg);
  }
  return res.json();
}

export async function getAppointment(token: string, id: string): Promise<AppointmentRecord> {
  const res = await fetch(`${BASE}/api/care/appointments/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const msg = await parseErrorMessage(res);
    throw new ApiError(res.status, msg);
  }
  return res.json();
}

export async function updateAppointment(
  token: string,
  id: string,
  data: AppointmentUpdate
): Promise<AppointmentRecord> {
  const res = await fetch(`${BASE}/api/care/appointments/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const msg = await parseErrorMessage(res);
    throw new ApiError(res.status, msg);
  }
  return res.json();
}

export async function deleteAppointment(token: string, id: string): Promise<void> {
  const res = await fetch(`${BASE}/api/care/appointments/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const msg = await parseErrorMessage(res);
    throw new ApiError(res.status, msg);
  }
}

export async function listFollowUps(
  token: string,
  params?: { status?: string; appointmentId?: string; profile_id?: string }
): Promise<FollowUpTask[]> {
  const url = new URL(`${BASE}/api/care/follow-ups`);
  if (params?.status) url.searchParams.set("status", params.status);
  if (params?.appointmentId) url.searchParams.set("appointment_id", params.appointmentId);
  if (params?.profile_id) url.searchParams.set("profile_id", params.profile_id);

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const msg = await parseErrorMessage(res);
    throw new ApiError(res.status, msg);
  }
  return res.json();
}

export async function createFollowUp(
  token: string,
  data: FollowUpTaskCreate
): Promise<FollowUpTask> {
  const res = await fetch(`${BASE}/api/care/follow-ups`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const msg = await parseErrorMessage(res);
    throw new ApiError(res.status, msg);
  }
  return res.json();
}

export async function getFollowUp(token: string, id: string): Promise<FollowUpTask> {
  const res = await fetch(`${BASE}/api/care/follow-ups/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const msg = await parseErrorMessage(res);
    throw new ApiError(res.status, msg);
  }
  return res.json();
}

export async function updateFollowUp(
  token: string,
  id: string,
  data: FollowUpTaskUpdate
): Promise<FollowUpTask> {
  const res = await fetch(`${BASE}/api/care/follow-ups/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const msg = await parseErrorMessage(res);
    throw new ApiError(res.status, msg);
  }
  return res.json();
}

export async function deleteFollowUp(token: string, id: string): Promise<void> {
  const res = await fetch(`${BASE}/api/care/follow-ups/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const msg = await parseErrorMessage(res);
    throw new ApiError(res.status, msg);
  }
}

// ---------------------------------------------------------------------------
// Medical Record Search & Knowledge Hub Types and Client
// ---------------------------------------------------------------------------

export interface SearchResultItem {
  id: string;
  result_type: "document" | "observation" | "medication" | "appointment" | "follow_up";
  record_id: string;
  title: string;
  snippet: string;
  source_document_id?: string | null;
  source_document_title?: string | null;
  page_number?: number | null;
  date?: string | null;
  date_provenance: "explicit" | "inferred" | "unknown";
  is_verified?: boolean | null;
  verification_status?: "verified" | "unverified" | "reviewed" | "not_applicable" | null;
  value?: string | null;
  unit?: string | null;
  reference_range?: string | null;
  flag?: string | null;
  relevance_score: number;
  frontend_destination: string;
}

export interface SearchQueryRequest {
  q: string;
  source_type?: "all" | "document" | "observation" | "medication" | "appointment" | "follow_up";
  start_date?: string | null;
  end_date?: string | null;
  verified_only?: boolean;
  sort_by?: "relevance" | "date";
  page?: number;
  page_size?: number;
}

export interface SearchResponse {
  query: string;
  parsed_intent?: string | null;
  total_results: number;
  page: number;
  page_size: number;
  results: SearchResultItem[];
  disclaimer: string;
}

export async function searchMedicalRecords(
  token: string,
  params: SearchQueryRequest
): Promise<SearchResponse> {
  const queryParams = new URLSearchParams();
  queryParams.set("q", params.q);
  if (params.source_type) queryParams.set("source_type", params.source_type);
  if (params.start_date) queryParams.set("start_date", params.start_date);
  if (params.end_date) queryParams.set("end_date", params.end_date);
  if (params.verified_only !== undefined) queryParams.set("verified_only", String(params.verified_only));
  if (params.sort_by) queryParams.set("sort_by", params.sort_by);
  if (params.page !== undefined) queryParams.set("page", String(params.page));
  if (params.page_size !== undefined) queryParams.set("page_size", String(params.page_size));

  const res = await fetch(`${BASE}/api/medical-search?${queryParams.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const msg = await parseErrorMessage(res);
    throw new ApiError(res.status, msg);
  }
  return res.json();
}

// ---------------------------------------------------------------------------
// Doctor Visit Preparation Pack API
// ---------------------------------------------------------------------------

export interface VisitPackDraftRequest {
  start_date?: string | null;
  end_date?: string | null;
  include_unverified?: boolean;
  categories?: string[];
  chief_complaint?: string | null;
  clinician_name?: string | null;
  profile_id?: string | null;
}

export interface VisitPackDocumentMeta {
  document_id: string;
  filename: string;
  clinical_date?: string | null;
  is_verified: boolean;
  page_count: number;
}

export interface VisitPackObservationItem {
  observation_id: string;
  document_id: string;
  document_title: string;
  test_name: string;
  category: string;
  value: string;
  unit?: string | null;
  reference_range?: string | null;
  flag?: string | null;
  clinical_date?: string | null;
  is_verified: boolean;
  page?: number | null;
  included: boolean;
}

export interface VisitPackTrendItem {
  test_name: string;
  category: string;
  baseline_date?: string | null;
  baseline_value?: string | null;
  latest_date?: string | null;
  latest_value?: string | null;
  change_description: string;
  included: boolean;
}

export interface VisitPackMedicationItem {
  id: string;
  name: string;
  strength?: string | null;
  dosage_instructions?: string | null;
  frequency?: string | null;
  prescriber?: string | null;
  status: string;
  notes?: string | null;
  included: boolean;
}

export interface VisitPackAppointmentItem {
  id: string;
  title: string;
  provider_name?: string | null;
  location?: string | null;
  scheduled_at: string;
  status: string;
  included: boolean;
}

export interface VisitPackTaskItem {
  id: string;
  title: string;
  due_at?: string | null;
  priority: string;
  status: string;
  appointment_id?: string | null;
  included: boolean;
}

export interface VisitPackQuestionItem {
  question: string;
  rationale?: string | null;
  source_reference?: string | null;
  included: boolean;
}

export interface DoctorVisitPackData {
  patient_name: string;
  patient_email: string;
  profile_id?: string | null;
  clinician_name?: string | null;
  chief_complaint?: string | null;
  patient_notes?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  generated_at: string;
  include_unverified: boolean;
  categories: string[];
  documents: VisitPackDocumentMeta[];
  observations: VisitPackObservationItem[];
  trends: VisitPackTrendItem[];
  medications: VisitPackMedicationItem[];
  appointments: VisitPackAppointmentItem[];
  follow_up_tasks: VisitPackTaskItem[];
  clinician_questions: VisitPackQuestionItem[];
  disclaimer: string;
}

export async function generateVisitPackDraft(
  token: string,
  req: VisitPackDraftRequest
): Promise<DoctorVisitPackData> {
  const res = await fetch(`${BASE}/api/visit-pack/draft`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(req),
  });
  if (!res.ok) {
    const msg = await parseErrorMessage(res);
    throw new ApiError(res.status, msg);
  }
  return res.json();
}

export async function exportVisitPackPdf(
  token: string,
  pack: DoctorVisitPackData
): Promise<Blob> {
  const res = await fetch(`${BASE}/api/visit-pack/export-pdf`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ pack }),
  });
  if (!res.ok) {
    const msg = await parseErrorMessage(res);
    throw new ApiError(res.status, msg);
  }
  return res.blob();
}

// ---------------------------------------------------------------------------
// Smart Health Reminders & Notifications Types & API Calls
// ---------------------------------------------------------------------------

export type ReminderCategory = "medication" | "appointment" | "follow_up" | "report_review" | "general";
export type ReminderFrequency = "once" | "daily" | "weekly" | "monthly";
export type ReminderDeliveryStatus = "pending" | "delivered" | "failed";

export interface ReminderItem {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  category: ReminderCategory;
  due_at: string;
  timezone: string;
  frequency: ReminderFrequency;
  send_email: boolean;
  is_enabled: boolean;
  medication_id: string | null;
  appointment_id: string | null;
  task_id: string | null;
  document_id: string | null;
  profile_id?: string | null;
  profile_name?: string | null;
  delivery_status: ReminderDeliveryStatus;
  delivered_at: string | null;
  delivery_error: string | null;
  is_acknowledged: boolean;
  acknowledged_at: string | null;
  is_dismissed: boolean;
  dismissed_at: string | null;
  created_at: string;
  updated_at: string;
  linked_title?: string | null;
  clinical_disclaimer?: string;
}

export interface InAppNotification {
  reminder_id: string;
  title: string;
  description: string | null;
  category: ReminderCategory;
  due_at: string;
  timezone: string;
  profile_id?: string | null;
  profile_name?: string | null;
  delivery_status: ReminderDeliveryStatus;
  delivered_at: string | null;
  is_acknowledged: boolean;
  is_overdue: boolean;
  delivery_channel: string;
  email_delivery_status: string | null;
  clinical_disclaimer: string;
}

export interface CreateReminderPayload {
  title: string;
  description?: string;
  category: ReminderCategory;
  due_at: string;
  timezone?: string;
  frequency?: ReminderFrequency;
  send_email?: boolean;
  is_enabled?: boolean;
  medication_id?: string;
  appointment_id?: string;
  task_id?: string;
  document_id?: string;
  profile_id?: string;
}

export interface UpdateReminderPayload {
  title?: string;
  description?: string;
  category?: ReminderCategory;
  due_at?: string;
  timezone?: string;
  frequency?: ReminderFrequency;
  send_email?: boolean;
  is_enabled?: boolean;
  medication_id?: string;
  appointment_id?: string;
  task_id?: string;
  document_id?: string;
  profile_id?: string;
}

export interface ProcessDueSummary {
  processed_count: number;
  delivered_in_app: number;
  emails_sent: number;
  emails_skipped: number;
  errors: string[];
}

export async function listReminders(
  token: string,
  filters?: {
    category?: string;
    delivery_status?: string;
    is_enabled?: boolean;
    is_acknowledged?: boolean;
    profile_id?: string;
  }
): Promise<ReminderItem[]> {
  const params = new URLSearchParams();
  if (filters?.category) params.append("category", filters.category);
  if (filters?.delivery_status) params.append("delivery_status", filters.delivery_status);
  if (filters?.is_enabled !== undefined) params.append("is_enabled", String(filters.is_enabled));
  if (filters?.is_acknowledged !== undefined) params.append("is_acknowledged", String(filters.is_acknowledged));
  if (filters?.profile_id) params.append("profile_id", filters.profile_id);
  if (filters?.category) params.append("category", filters.category);
  if (filters?.delivery_status) params.append("delivery_status", filters.delivery_status);
  if (filters?.is_enabled !== undefined) params.append("is_enabled", String(filters.is_enabled));
  if (filters?.is_acknowledged !== undefined) params.append("is_acknowledged", String(filters.is_acknowledged));

  const qs = params.toString() ? `?${params.toString()}` : "";
  const res = await fetch(`${BASE}/api/reminders${qs}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const msg = await parseErrorMessage(res);
    throw new ApiError(res.status, msg);
  }
  return res.json();
}

export async function createReminder(
  token: string,
  payload: CreateReminderPayload
): Promise<ReminderItem> {
  const res = await fetch(`${BASE}/api/reminders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const msg = await parseErrorMessage(res);
    throw new ApiError(res.status, msg);
  }
  return res.json();
}

export async function updateReminder(
  token: string,
  id: string,
  payload: UpdateReminderPayload
): Promise<ReminderItem> {
  const res = await fetch(`${BASE}/api/reminders/${id}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const msg = await parseErrorMessage(res);
    throw new ApiError(res.status, msg);
  }
  return res.json();
}

export async function deleteReminder(
  token: string,
  id: string
): Promise<{ message: string }> {
  const res = await fetch(`${BASE}/api/reminders/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const msg = await parseErrorMessage(res);
    throw new ApiError(res.status, msg);
  }
  return res.json();
}

export async function acknowledgeReminder(
  token: string,
  id: string
): Promise<{ reminder_id: string; is_acknowledged: boolean; acknowledged_at: string; message: string }> {
  const res = await fetch(`${BASE}/api/reminders/${id}/acknowledge`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const msg = await parseErrorMessage(res);
    throw new ApiError(res.status, msg);
  }
  return res.json();
}

export async function dismissReminder(
  token: string,
  id: string
): Promise<ReminderItem> {
  const res = await fetch(`${BASE}/api/reminders/${id}/dismiss`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const msg = await parseErrorMessage(res);
    throw new ApiError(res.status, msg);
  }
  return res.json();
}

export async function getInAppNotifications(
  token: string,
  unacknowledgedOnly = false,
  limit = 50
): Promise<InAppNotification[]> {
  const params = new URLSearchParams({
    unacknowledged_only: String(unacknowledgedOnly),
    limit: String(limit),
  });
  const res = await fetch(`${BASE}/api/reminders/notifications/in-app?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const msg = await parseErrorMessage(res);
    throw new ApiError(res.status, msg);
  }
  return res.json();
}

export async function processDueReminders(token: string): Promise<ProcessDueSummary> {
  const res = await fetch(`${BASE}/api/reminders/process-due`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const msg = await parseErrorMessage(res);
    throw new ApiError(res.status, msg);
  }
  return res.json();
}

// ---------------------------------------------------------------------------
// Family Health Profiles API (Feature 3)
// ---------------------------------------------------------------------------

export type RelationshipType =
  | "self"
  | "spouse"
  | "child"
  | "parent"
  | "sibling"
  | "dependent"
  | "other";

export type ConsentStatusType =
  | "authorized"
  | "pending_consent"
  | "revoked";

export type GenderType =
  | "male"
  | "female"
  | "other"
  | "prefer_not_to_say";

export interface ProfileHealthSummary {
  document_count: number;
  medication_count: number;
  appointment_count: number;
  reminder_count: number;
}

export interface FamilyProfile {
  id: string;
  owner_id: string;
  name: string;
  relationship: RelationshipType;
  date_of_birth?: string | null;
  gender?: GenderType | null;
  blood_type?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
  allergies_summary?: string | null;
  avatar_color?: string | null;
  is_primary: boolean;
  is_active: boolean;
  is_dependent: boolean;
  consent_status: ConsentStatusType;
  consent_granted_at?: string | null;
  consent_notes?: string | null;
  created_at: string;
  updated_at: string;
  health_summary?: ProfileHealthSummary | null;
}

export interface FamilyProfileCreatePayload {
  name: string;
  relationship: RelationshipType;
  date_of_birth?: string | null;
  gender?: GenderType | null;
  blood_type?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
  allergies_summary?: string | null;
  avatar_color?: string | null;
  is_dependent?: boolean;
  consent_status?: ConsentStatusType;
  consent_notes?: string | null;
}

export interface FamilyProfileUpdatePayload {
  name?: string;
  relationship?: RelationshipType;
  date_of_birth?: string | null;
  gender?: GenderType | null;
  blood_type?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
  allergies_summary?: string | null;
  avatar_color?: string | null;
  is_dependent?: boolean;
  consent_status?: ConsentStatusType;
  consent_notes?: string | null;
  is_active?: boolean;
}

export interface FamilyProfileDeactivateResponse {
  profile_id: string;
  name: string;
  is_active: boolean;
  message: string;
  record_retention_note: string;
}

export async function listFamilyProfiles(
  token: string,
  includeInactive = false
): Promise<FamilyProfile[]> {
  const params = new URLSearchParams();
  if (includeInactive) {
    params.set("include_inactive", "true");
  }
  const qs = params.toString() ? `?${params.toString()}` : "";
  const res = await fetch(`${BASE}/api/family-profiles${qs}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const msg = await parseErrorMessage(res);
    throw new ApiError(res.status, msg);
  }
  return res.json();
}

export async function createFamilyProfile(
  token: string,
  payload: FamilyProfileCreatePayload
): Promise<FamilyProfile> {
  const res = await fetch(`${BASE}/api/family-profiles`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const msg = await parseErrorMessage(res);
    throw new ApiError(res.status, msg);
  }
  return res.json();
}

export async function getFamilyProfile(
  token: string,
  profileId: string
): Promise<FamilyProfile> {
  const res = await fetch(`${BASE}/api/family-profiles/${profileId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const msg = await parseErrorMessage(res);
    throw new ApiError(res.status, msg);
  }
  return res.json();
}

export async function updateFamilyProfile(
  token: string,
  profileId: string,
  payload: FamilyProfileUpdatePayload
): Promise<FamilyProfile> {
  const res = await fetch(`${BASE}/api/family-profiles/${profileId}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const msg = await parseErrorMessage(res);
    throw new ApiError(res.status, msg);
  }
  return res.json();
}

export async function deactivateFamilyProfile(
  token: string,
  profileId: string
): Promise<FamilyProfileDeactivateResponse> {
  const res = await fetch(`${BASE}/api/family-profiles/${profileId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const msg = await parseErrorMessage(res);
    throw new ApiError(res.status, msg);
  }
  return res.json();
}

// ============================================================================
// Feature 4: Secure Doctor Sharing Types & API
// ============================================================================

export interface SharedResourcesConfig {
  document_ids: string[];
  include_visit_pack: boolean;
  visit_pack_categories: string[];
  include_medications: boolean;
  include_appointments: boolean;
}

export interface DoctorSharingCreatePayload {
  profile_id: string;
  doctor_name: string;
  doctor_email?: string | null;
  expires_in_days: number;
  shared_resources: SharedResourcesConfig;
  notes?: string | null;
}

export interface DoctorSharingItem {
  id: string;
  owner_id: string;
  profile_id: string;
  profile_name: string;
  doctor_name: string;
  doctor_email?: string | null;
  status: "active" | "expired" | "revoked" | string;
  is_expired: boolean;
  expires_at: string;
  revoked_at?: string | null;
  last_accessed_at?: string | null;
  access_count: number;
  shared_resources: SharedResourcesConfig;
  notes?: string | null;
  created_at: string;
}

export interface DoctorSharingCreateResponse extends DoctorSharingItem {
  access_token: string;
  share_url: string;
}

export interface DoctorSharingAuditLogItem {
  id: string;
  session_id: string;
  event_type: string;
  resource_id?: string | null;
  ip_address?: string | null;
  user_agent?: string | null;
  details?: string | null;
  created_at: string;
}

export interface DoctorSharedDocumentItem {
  id: string;
  title: string;
  category?: string | null;
  document_date?: string | null;
  file_type?: string | null;
  file_size_bytes?: number | null;
  summary?: string | null;
}

export interface DoctorSharedMedicationItem {
  id: string;
  name: string;
  dosage?: string | null;
  frequency?: string | null;
  is_active: boolean;
  notes?: string | null;
}

export interface DoctorSharedAppointmentItem {
  id: string;
  doctor_name: string;
  specialty?: string | null;
  appointment_date?: string | null;
  location?: string | null;
  notes?: string | null;
}

export interface DoctorSharedHealthView {
  patient_name: string;
  patient_relationship: string;
  patient_age?: number | null;
  patient_gender?: string | null;
  allergies_summary?: string | null;
  emergency_contact?: string | null;
  doctor_name: string;
  expires_at: string;
  status: string;
  shared_resources: SharedResourcesConfig;
  documents: DoctorSharedDocumentItem[];
  medications: DoctorSharedMedicationItem[];
  appointments: DoctorSharedAppointmentItem[];
  has_visit_pack: boolean;
  notes?: string | null;
}

export async function listDoctorShares(
  token: string,
  profileId?: string
): Promise<DoctorSharingItem[]> {
  const params = new URLSearchParams();
  if (profileId) {
    params.set("profile_id", profileId);
  }
  const qs = params.toString() ? `?${params.toString()}` : "";
  const res = await fetch(`${BASE}/api/doctor-sharing${qs}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const msg = await parseErrorMessage(res);
    throw new ApiError(res.status, msg);
  }
  return res.json();
}

export async function createDoctorShare(
  token: string,
  payload: DoctorSharingCreatePayload
): Promise<DoctorSharingCreateResponse> {
  const res = await fetch(`${BASE}/api/doctor-sharing`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const msg = await parseErrorMessage(res);
    throw new ApiError(res.status, msg);
  }
  return res.json();
}

export async function getDoctorShare(
  token: string,
  shareId: string
): Promise<DoctorSharingItem> {
  const res = await fetch(`${BASE}/api/doctor-sharing/${shareId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const msg = await parseErrorMessage(res);
    throw new ApiError(res.status, msg);
  }
  return res.json();
}

export async function revokeDoctorShare(
  token: string,
  shareId: string
): Promise<DoctorSharingItem> {
  const res = await fetch(`${BASE}/api/doctor-sharing/${shareId}/revoke`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const msg = await parseErrorMessage(res);
    throw new ApiError(res.status, msg);
  }
  return res.json();
}

export async function getDoctorShareAudit(
  token: string,
  shareId: string
): Promise<DoctorSharingAuditLogItem[]> {
  const res = await fetch(`${BASE}/api/doctor-sharing/${shareId}/audit`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const msg = await parseErrorMessage(res);
    throw new ApiError(res.status, msg);
  }
  return res.json();
}

export async function getSharedHealthPortalView(
  tokenStr: string
): Promise<DoctorSharedHealthView> {
  const res = await fetch(`${BASE}/api/shared-health/${encodeURIComponent(tokenStr)}`, {
    headers: { "Cache-Control": "no-cache" },
  });
  if (!res.ok) {
    const msg = await parseErrorMessage(res);
    throw new ApiError(res.status, msg);
  }
  return res.json();
}

export function getSharedDocumentDownloadUrl(
  tokenStr: string,
  documentId: string,
  inline = false
): string {
  const qs = inline ? "?inline=true" : "";
  return `${BASE}/api/shared-health/${encodeURIComponent(tokenStr)}/documents/${encodeURIComponent(documentId)}${qs}`;
}

export function getSharedVisitPackDownloadUrl(tokenStr: string): string {
  return `${BASE}/api/shared-health/${encodeURIComponent(tokenStr)}/visit-pack`;
}

// ============================================================================
// FEATURE 5: DUPLICATE DETECTION & DATA QUALITY CENTER
// ============================================================================

export interface MatchReason {
  code: string;
  description: string;
  metrics?: Record<string, any>;
}

export interface RecordSummary {
  id: string;
  record_type: "document" | "observation";
  title: string;
  profile_id?: string | null;
  profile_name?: string | null;
  clinical_date?: string | null;
  created_at?: string | null;
  details: Record<string, any>;
  is_archived?: boolean;
}

export interface DuplicateCandidateItem {
  id: string;
  user_id: string;
  profile_id?: string | null;
  record_type: "document" | "observation";
  primary_record_id: string;
  secondary_record_id: string;
  confidence: number;
  match_reasons: MatchReason[];
  status: "pending" | "confirmed_duplicate" | "not_duplicate" | "resolved";
  review_notes?: string | null;
  retained_record_id?: string | null;
  archived_record_id?: string | null;
  detected_at: string;
  reviewed_at?: string | null;
  resolved_at?: string | null;
  primary_summary?: RecordSummary | null;
  secondary_summary?: RecordSummary | null;
}

export interface DuplicateCandidateListResponse {
  items: DuplicateCandidateItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface DuplicateComparisonView {
  candidate_id: string;
  record_type: "document" | "observation";
  confidence: number;
  status: string;
  match_reasons: MatchReason[];
  primary_record: RecordSummary;
  secondary_record: RecordSummary;
  differences: string[];
  similarities: string[];
}

export interface ResolveDuplicateRequest {
  retained_record_id: string;
  decision_notes?: string;
}

export interface DataQualitySummary {
  total_candidates: number;
  pending_candidates: number;
  high_confidence_candidates: number;
  confirmed_duplicates: number;
  resolved_duplicates: number;
  dismissed_candidates: number;
  document_candidates: number;
  observation_candidates: number;
  last_scan_at?: string | null;
}

export interface DataQualityAuditLogItem {
  id: string;
  user_id: string;
  profile_id?: string | null;
  candidate_id?: string | null;
  action: string;
  record_type: string;
  primary_record_id?: string | null;
  secondary_record_id?: string | null;
  retained_record_id?: string | null;
  archived_record_id?: string | null;
  details?: Record<string, any>;
  created_at: string;
}

export async function scanDuplicates(
  token: string,
  profileId?: string
): Promise<DataQualitySummary> {
  const query = new URLSearchParams();
  if (profileId) query.set("profile_id", profileId);

  const url = `${BASE}/api/data-quality/scan${query.toString() ? `?${query.toString()}` : ""}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const msg = await parseErrorMessage(res);
    throw new ApiError(res.status, msg);
  }
  return res.json();
}

export async function getDataQualitySummary(
  token: string,
  profileId?: string
): Promise<DataQualitySummary> {
  const query = new URLSearchParams();
  if (profileId) query.set("profile_id", profileId);

  const url = `${BASE}/api/data-quality/summary${query.toString() ? `?${query.toString()}` : ""}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const msg = await parseErrorMessage(res);
    throw new ApiError(res.status, msg);
  }
  return res.json();
}

export async function listDuplicateCandidates(
  token: string,
  params: {
    profileId?: string;
    status?: string;
    recordType?: string;
    minConfidence?: number;
    page?: number;
    pageSize?: number;
  } = {}
): Promise<DuplicateCandidateListResponse> {
  const query = new URLSearchParams();
  if (params.profileId) query.set("profile_id", params.profileId);
  if (params.status) query.set("status", params.status);
  if (params.recordType) query.set("record_type", params.recordType);
  if (params.minConfidence !== undefined) query.set("min_confidence", String(params.minConfidence));
  if (params.page !== undefined) query.set("page", String(params.page));
  if (params.pageSize !== undefined) query.set("page_size", String(params.pageSize));

  const url = `${BASE}/api/data-quality/candidates${query.toString() ? `?${query.toString()}` : ""}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const msg = await parseErrorMessage(res);
    throw new ApiError(res.status, msg);
  }
  return res.json();
}

export async function getDuplicateComparison(
  token: string,
  candidateId: string
): Promise<DuplicateComparisonView> {
  const res = await fetch(`${BASE}/api/data-quality/candidates/${encodeURIComponent(candidateId)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const msg = await parseErrorMessage(res);
    throw new ApiError(res.status, msg);
  }
  return res.json();
}

export async function confirmDuplicateCandidate(
  token: string,
  candidateId: string
): Promise<DuplicateCandidateItem> {
  const res = await fetch(`${BASE}/api/data-quality/candidates/${encodeURIComponent(candidateId)}/confirm`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const msg = await parseErrorMessage(res);
    throw new ApiError(res.status, msg);
  }
  return res.json();
}

export async function dismissDuplicateCandidate(
  token: string,
  candidateId: string,
  notes?: string
): Promise<DuplicateCandidateItem> {
  const res = await fetch(`${BASE}/api/data-quality/candidates/${encodeURIComponent(candidateId)}/dismiss`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ notes }),
  });
  if (!res.ok) {
    const msg = await parseErrorMessage(res);
    throw new ApiError(res.status, msg);
  }
  return res.json();
}

export async function resolveDuplicateCandidate(
  token: string,
  candidateId: string,
  payload: ResolveDuplicateRequest
): Promise<DuplicateCandidateItem> {
  const res = await fetch(`${BASE}/api/data-quality/candidates/${encodeURIComponent(candidateId)}/resolve`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const msg = await parseErrorMessage(res);
    throw new ApiError(res.status, msg);
  }
  return res.json();
}

export async function getDataQualityAuditHistory(
  token: string,
  limit = 50
): Promise<DataQualityAuditLogItem[]> {
  const query = new URLSearchParams({ limit: String(limit) });
  const res = await fetch(`${BASE}/api/data-quality/history?${query.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const msg = await parseErrorMessage(res);
    throw new ApiError(res.status, msg);
  }
  return res.json();
}

// ---------------------------------------------------------------------------
// Quick Reference AI Assistant (v4 F-37)
// ---------------------------------------------------------------------------

export type QuickReferenceMode =
  | "medical_term"
  | "understand_test"
  | "general_reference"
  | "explain_report"
  | "find_records"
  | "prepare_doctor_questions";

export interface QuickReferenceQueryRequest {
  mode: QuickReferenceMode;
  question: string;
  term?: string;
  unit?: string;
  record_ids?: string[];
  include_archived?: boolean;
  response_style?: "concise" | "expanded";
}

export interface ProfileQuickReferenceRequest {
  mode: "explain_report" | "find_records" | "prepare_doctor_questions";
  question: string;
  record_ids?: string[];
  include_archived?: boolean;
  response_style?: "concise" | "expanded";
}

export interface QuickReferenceSourceItem {
  id: string;
  title: string;
  publisher: string;
  url: string;
  published_at?: string | null;
  retrieved_at: string;
  license_or_reuse_note?: string | null;
}

export interface QuickReferenceRecordCitation {
  id: string;
  document_id: string;
  document_title: string;
  page_number?: number | null;
  clinical_date?: string | null;
  test_name?: string | null;
  value?: string | null;
  unit?: string | null;
  reference_range?: string | null;
  abnormal_flag?: string | null;
  is_reviewed?: boolean;
}

export interface QuickReferenceResponse {
  mode: QuickReferenceMode | string;
  scope: "general_reference" | "from_records";
  answer: string;
  expanded_answer?: string | null;
  sources: QuickReferenceSourceItem[];
  record_citations: QuickReferenceRecordCitation[];
  limitations: string[];
  generation: {
    used: boolean;
    provider: string;
    cached: boolean;
  };
  status: "grounded" | "no_evidence_found" | "fallback" | "quota_exhausted" | "emergency_redirect";
  request_id: string;
  questions_to_ask?: string[];
}

export interface QuickReferenceSuggestionMode {
  mode: QuickReferenceMode;
  title: string;
  description: string;
  example_prompts: string[];
}

export interface QuickReferenceSuggestionsResponse {
  suggestions: QuickReferenceSuggestionMode[];
}

export interface QuickReferenceSourcesResponse {
  count: number;
  sources: Array<{
    id: string;
    term: string;
    category: string;
    definition: string;
    what_it_measures: string;
    why_ordered: string;
    typical_units: string[];
    reference_note: string;
    questions_to_ask: string[];
    publisher: string;
    canonical_url: string;
    license_or_reuse_note: string;
    published_at?: string;
    retrieved_at: string;
  }>;
}

export interface AiUsageResponse {
  quick_reference_limit: number;
  quick_reference_used: number;
  quick_reference_remaining: number;
  chat_limit: number;
  chat_used: number;
  chat_remaining: number;
  quota_reset_at: string;
}

export async function queryQuickReference(
  token: string,
  payload: QuickReferenceQueryRequest
): Promise<QuickReferenceResponse> {
  const res = await fetch(`${BASE}/api/quick-reference/query`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const msg = await parseErrorMessage(res);
    throw new ApiError(res.status, msg);
  }
  return res.json();
}

export async function queryProfileQuickReference(
  token: string,
  profileId: string,
  payload: ProfileQuickReferenceRequest
): Promise<QuickReferenceResponse> {
  const res = await fetch(
    `${BASE}/api/profiles/${encodeURIComponent(profileId)}/quick-reference/records`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    }
  );
  if (!res.ok) {
    const msg = await parseErrorMessage(res);
    throw new ApiError(res.status, msg);
  }
  return res.json();
}

export async function getQuickReferenceSuggestions(): Promise<QuickReferenceSuggestionsResponse> {
  const res = await fetch(`${BASE}/api/quick-reference/suggestions`);
  if (!res.ok) {
    const msg = await parseErrorMessage(res);
    throw new ApiError(res.status, msg);
  }
  return res.json();
}

export async function getQuickReferenceSources(): Promise<QuickReferenceSourcesResponse> {
  const res = await fetch(`${BASE}/api/quick-reference/sources`);
  if (!res.ok) {
    const msg = await parseErrorMessage(res);
    throw new ApiError(res.status, msg);
  }
  return res.json();
}

export async function getMyAiUsage(token: string): Promise<AiUsageResponse> {
  const res = await fetch(`${BASE}/api/me/ai-usage`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) {
    const msg = await parseErrorMessage(res);
    throw new ApiError(res.status, msg);
  }
  return res.json();
}


