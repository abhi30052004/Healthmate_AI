import React, { useState } from "react";
import {
  downloadPdfHealthReport,
  downloadCsvObservations,
} from "../api/client";

interface ExportCenterProps {
  token: string;
}

export function ExportCenter({ token }: ExportCenterProps) {
  // Common export filters
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [includeUnverified, setIncludeUnverified] = useState(false);

  // PDF section selection
  const [includeOverview, setIncludeOverview] = useState(true);
  const [includeSourceDocs, setIncludeSourceDocs] = useState(true);
  const [includeInsightsSummary, setIncludeInsightsSummary] = useState(true);
  const [includeObservations, setIncludeObservations] = useState(true);
  const [includeTrends, setIncludeTrends] = useState(true);
  const [includeDataQuality, setIncludeDataQuality] = useState(true);
  const [includeClinicianQuestions, setIncludeClinicianQuestions] = useState(true);
  const [includeDisclaimers, setIncludeDisclaimers] = useState(true);

  // Loading & notification states
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [downloadingCsv, setDownloadingCsv] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  function getSelectedSections(): string[] {
    const sections: string[] = [];
    if (includeOverview) sections.push("overview");
    if (includeSourceDocs) sections.push("source_documents");
    if (includeInsightsSummary) sections.push("summary");
    if (includeObservations) sections.push("observations");
    if (includeTrends) sections.push("trends");
    if (includeDataQuality) sections.push("data_quality");
    if (includeClinicianQuestions) sections.push("clinician_questions");
    if (includeDisclaimers) sections.push("disclaimers");
    return sections;
  }

  async function handleDownloadPdf() {
    setDownloadingPdf(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const filename = await downloadPdfHealthReport(token, {
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        includeUnverified,
        sections: getSelectedSections(),
      });
      setSuccessMessage(`Successfully generated and downloaded PDF report: ${filename}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to generate PDF health report";
      setError(msg);
    } finally {
      setDownloadingPdf(false);
    }
  }

  async function handleDownloadCsv() {
    setDownloadingCsv(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const filename = await downloadCsvObservations(token, {
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        includeUnverified,
      });
      setSuccessMessage(`Successfully exported and downloaded observations CSV: ${filename}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to export observations CSV";
      setError(msg);
    } finally {
      setDownloadingCsv(false);
    }
  }

  return (
    <div className="export-center-container" data-testid="export-center">
      <div className="section-header">
        <div>
          <h2>📥 Export Center</h2>
          <p className="subtitle">
            Generate and export your verified clinical records, longitudinal changes, and medical observations as a
            professionally formatted PDF document or structured CSV spreadsheet.
          </p>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="alert alert-danger" role="alert" data-testid="export-error">
          <span className="alert-icon">⚠️</span>
          <span>{error}</span>
          <button className="alert-close" onClick={() => setError(null)} aria-label="Dismiss error">
            ×
          </button>
        </div>
      )}

      {successMessage && (
        <div className="alert alert-success" role="alert" data-testid="export-success">
          <span className="alert-icon">✓</span>
          <span>{successMessage}</span>
          <button className="alert-close" onClick={() => setSuccessMessage(null)} aria-label="Dismiss message">
            ×
          </button>
        </div>
      )}

      {/* Export Scope & Scope Filters */}
      <div className="card export-filters-card">
        <h3>1. Select Export Scope & Filters</h3>
        <p className="helper-text">
          Customize the date boundary and review status of clinical observations included in your export.
        </p>

        <div className="filters-grid">
          <div className="form-group">
            <label htmlFor="export-start-date">Earliest Record Date (Optional):</label>
            <input
              type="date"
              id="export-start-date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="form-control"
              data-testid="export-start-date"
            />
          </div>

          <div className="form-group">
            <label htmlFor="export-end-date">Latest Record Date (Optional):</label>
            <input
              type="date"
              id="export-end-date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="form-control"
              data-testid="export-end-date"
            />
          </div>

          <div className="form-group checkbox-group-top">
            <label htmlFor="export-include-unverified" className="checkbox-label">
              <input
                type="checkbox"
                id="export-include-unverified"
                checked={includeUnverified}
                onChange={(e) => setIncludeUnverified(e.target.checked)}
                data-testid="export-include-unverified"
              />
              Include Unverified Observations
            </label>
            <span className="field-hint">
              Unverified observations are excluded by default. When checked, each item is distinctly labelled as
              &quot;Unverified / Pending Review&quot;.
            </span>
          </div>
        </div>

        {/* Selected Scope Summary */}
        <div className="scope-summary-pill" data-testid="export-scope-summary">
          <strong>Selected Export Scope:</strong> Records from{" "}
          <span className="scope-highlight">{startDate || "Earliest available"}</span> to{" "}
          <span className="scope-highlight">{endDate || "Latest available"}</span> | Verification:{" "}
          <span className="scope-highlight">{includeUnverified ? "Verified + Unverified" : "Verified Only"}</span>
        </div>
      </div>

      <div className="export-cards-grid">
        {/* PDF Health Report Card */}
        <div className="card export-action-card pdf-card">
          <div className="card-top-icon">📄</div>
          <h3>Personalized Health Summary PDF</h3>
          <p className="export-card-desc">
            A comprehensive, publication-ready PDF designed to be shared with healthcare practitioners or saved for
            your personal health dossier. Includes verified lab results, reference ranges, longitudinal changes,
            data-quality disclosures, and clinical citations.
          </p>

          <div className="pdf-sections-box">
            <h4>Included PDF Sections:</h4>
            <div className="section-checkbox-grid">
              <label>
                <input
                  type="checkbox"
                  checked={includeOverview}
                  onChange={(e) => setIncludeOverview(e.target.checked)}
                />
                1. Account Overview & Stats
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={includeSourceDocs}
                  onChange={(e) => setIncludeSourceDocs(e.target.checked)}
                />
                2. Uploaded Source Reports
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={includeInsightsSummary}
                  onChange={(e) => setIncludeInsightsSummary(e.target.checked)}
                />
                3. Clinical Observations & Insights
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={includeObservations}
                  onChange={(e) => setIncludeObservations(e.target.checked)}
                />
                4. Recorded Clinical Observations
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={includeTrends}
                  onChange={(e) => setIncludeTrends(e.target.checked)}
                />
                5. Comparable Historical Changes
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={includeDataQuality}
                  onChange={(e) => setIncludeDataQuality(e.target.checked)}
                />
                6. Data Quality & Limitations
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={includeClinicianQuestions}
                  onChange={(e) => setIncludeClinicianQuestions(e.target.checked)}
                />
                7. Clinician Discussion Prompts
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={includeDisclaimers}
                  onChange={(e) => setIncludeDisclaimers(e.target.checked)}
                  disabled
                />
                8. Medical Safety Disclaimers (Required)
              </label>
            </div>
          </div>

          <div className="export-btn-wrap">
            <button
              type="button"
              className="btn btn-primary btn-block"
              onClick={handleDownloadPdf}
              disabled={downloadingPdf || downloadingCsv}
              id="download-pdf-button"
              data-testid="download-pdf-btn"
            >
              {downloadingPdf ? (
                <>
                  <span className="spinner-sm" /> Generating PDF Report…
                </>
              ) : (
                "📥 Download PDF Health Report"
              )}
            </button>
          </div>
        </div>

        {/* CSV Observations Export Card */}
        <div className="card export-action-card csv-card">
          <div className="card-top-icon">📊</div>
          <h3>Structured Observations CSV</h3>
          <p className="export-card-desc">
            Raw tabular export of your medical observations suitable for spreadsheet analysis (Excel, Google Sheets) or
            personal digital health backups.
          </p>

          <div className="csv-features-box">
            <h4>Export Properties:</h4>
            <ul>
              <li>
                <strong>Complete Provenance:</strong> Includes Document Title, Clinical Date, Date Provenance, Source
                Page, and Extraction Excerpts.
              </li>
              <li>
                <strong>Clinical Accuracy:</strong> Original recorded test names, values, units, laboratory flags, and
                reference ranges are preserved.
              </li>
              <li>
                <strong>Security Protection:</strong> Automated spreadsheet formula injection mitigation (RFC-safe
                escaping and apostrophe prefixes for formula characters).
              </li>
              <li>
                <strong>Encoding:</strong> UTF-8 with Byte Order Mark (BOM) for seamless opening in Microsoft Excel.
              </li>
            </ul>
          </div>

          <div className="export-btn-wrap">
            <button
              type="button"
              className="btn btn-secondary btn-block"
              onClick={handleDownloadCsv}
              disabled={downloadingCsv || downloadingPdf}
              id="download-csv-button"
              data-testid="download-csv-btn"
            >
              {downloadingCsv ? (
                <>
                  <span className="spinner-sm" /> Exporting CSV Data…
                </>
              ) : (
                "📥 Download Observations CSV"
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Safety & Compliance Box */}
      <div className="card export-disclaimer-card" data-testid="export-disclaimer">
        <h4>🛡️ Medical Safety & Confidentiality Notice</h4>
        <p>
          HealthMate AI export files reflect recorded data extracted from your uploaded medical documents. This summary
          is intended for personal recordkeeping and collaborative discussion with your healthcare professional.
          HealthMate AI does not diagnose conditions, predict clinical outcomes, or prescribe medical treatments. All
          exported medical records remain strictly private and accessible only to your authenticated account.
        </p>
      </div>
    </div>
  );
}
