# Feature Catalogue and Acceptance Criteria

Status vocabulary: **Implemented** = previously reported in project history; **Verify** = implementation exists or was reported but must be checked against current code; **Planned** = specification only; **Out of scope** = not permitted in current product boundary. Status is not a substitute for a fresh code audit.

| ID | Feature | Priority | Status baseline |
|---|---|---|---|
| F-01 | Authentication and sessions | P0 | Implemented; verify current security |
| F-02 | Family health profiles and switching | P0 | Implemented/verify all endpoints |
| F-03 | Document upload and private storage | P0 | Implemented/verify production storage |
| F-04 | OCR and structured extraction | P0 | Implemented |
| F-05 | Human verification workflow | P0 | Implemented |
| F-06 | Health timeline and trends | P0 | Implemented |
| F-07 | AI chat with citations | P0 | Implemented |
| F-08 | Health summary and insights | P1 | Implemented/verify scoping |
| F-09 | Report comparison and export | P1 | Implemented/verify |
| F-10 | Medication and appointment management | P1 | Implemented/verify |
| F-11 | Medical knowledge search | P1 | Implemented |
| F-12 | Archive controls and data quality | P1 | Partial/verify |
| F-13 | Doctor Visit Pack | P0 | Implemented/verify |
| F-14 | Smart reminders and dose logs | P1 | Planned/verify actual delivery |
| F-15 | Secure QR doctor sharing | P1 | Planned/verify complete flow |
| F-16 | Caregiver invitation and granular roles | P1 | Planned/verify |
| F-17 | Duplicate detection and merge review | P1 | Planned |
| F-18 | Emergency card QR | P2 | Planned |
| F-19 | MCP server | P2 | Planned |
| F-20 | Multilingual and offline PWA | P2 | Planned |
| F-21 | Wearables / ABDM interoperability | P3 | Research only |
| F-37 | Quick Reference AI Assistant (general terms, test explanations, report quick read, record lookup) | P1 | OpenAI usage-based; retrieval/rules free | Planned (v4 specification) |

## F-01 Authentication
**User value:** Secure account access.
- Register/login/logout and token/session renewal.
- Password hashing using Argon2id or bcrypt with current safe parameters.
- Rate limit login and recovery.
- Do not reveal whether an email exists during recovery.
- Revoke refresh sessions on logout/password change.
**Acceptance:** unauthenticated private APIs return 401; expired/revoked session cannot access data; password never appears in logs.

## F-02 Profiles and family access
- Create profile with display name, relationship label and optional demographics only when needed.
- Profile selector clearly indicates current profile.
- Caregiver invitation requires owner action and acceptance.
- Membership roles: owner, caregiver-editor, caregiver-viewer. Clinician guests are not accounts; they use scoped share sessions (see AUTH.md).
- Server checks profile permission on every request; frontend selection is not authority.
**Acceptance:** switching profile clears cached query data; direct API requests cannot cross profile boundaries.

## F-03–05 Document pipeline
States: `uploaded → queued → processing → needs_review → verified`; terminal alternatives: `failed`, `rejected`, `archived`.
- Validate extension, MIME signature, size, page count and decompression limits.
- Calculate SHA-256 checksum for duplicate candidates.
- OCR page-wise and retain source coordinates when available.
- Extract candidate labs, vitals, medication mentions and dates using schema validation.
- Show original document beside extracted fields.
- User confirms each structured item.
**Acceptance:** failed OCR remains recoverable; unverified fields are visibly labelled and excluded from trusted trends/AI facts.

## F-06 Timeline and trends
- Filters by category, date range, source and verification.
- Chart points link to source and detail.
- Show unit, date, reference range and data status.
- Explain that reference ranges vary by lab and context.
- Delta labels describe numeric change, not clinical meaning.
**Acceptance:** tests cover sorting, missing values, unit compatibility and duplicate dates.

## F-07 Assistant
- Question examples: “What was my latest HbA1c?” and “Summarise my last two reports.”
- Return concise answer, citations, evidence dates and limitations.
- No diagnosis, treatment, dose change or emergency triage.
- No evidence → explicit not-found response.
**Acceptance:** citations resolve to real chunks from the active profile; prompt injection in source documents cannot alter policy.

## F-08 Insights
- Summarise only verified, relevant facts.
- Separate observation from interpretation.
- Show evidence links and last-updated date.
- No disease risk score or prognosis unless separately clinically validated and approved.
**Acceptance:** every generated insight has provenance and a dismiss/correct/report action.

## F-09 Comparison and export
- Compare selected reports or canonical tests.
- Preserve original units and indicate when values are not comparable.
- Export PDF/CSV only after permission check.
- Exports include generated date, profile label, selected date range and disclaimer.
**Acceptance:** export cannot include another profile or archived data unless explicitly selected and authorised.

## F-10 Medication and appointments
- Medication list stores name, strength as written, form, instructions as recorded, source and verification.
- Do not calculate or recommend a dose.
- Appointment has date/time/timezone, provider label, location optional, notes and reminder preference.
**Acceptance:** medication changes are user-confirmed; no agent can silently alter an active medication.

## F-13 Doctor Visit Pack
Sections: reason for visit, current concerns, selected labs/vitals, medication list, allergies (if verified), relevant documents, timeline, questions and user notes.
- User chooses period and categories.
- Preview before export/share.
- Clearly label unverified information.
**Acceptance:** all included facts link to source records; excluded categories remain excluded.

## F-14 Reminders
- Schedule, timezone, channel, quiet hours, discreet mode, snooze and dose outcome.
- Refill reminders are based on user-entered supply and schedule assumptions, not prescribing.
- Caregiver escalation requires consent and configured relationship.
**Acceptance:** idempotent tick, channel failure handling, no duplicate notifications, opt-out works immediately.

## F-15 QR sharing
- Scope by profile, categories, date range, expiry and optional PIN.
- Opaque high-entropy token; hash token at rest.
- Rate limit and audit guest access.
- Revoke and expire fail closed.
**Acceptance:** QR itself reveals no health information; revoked token returns unavailable on next request.

## F-17 Data Quality Centre
- Duplicate candidates based on checksum, date, canonical test, value and source similarity.
- Explain why items were flagged.
- User chooses keep, dismiss, merge or replace.
- Preserve audit history and original source.
**Acceptance:** no automatic destructive merge; undo or correction path is documented.

## F-18 Emergency card
- User chooses minimum fields: emergency contact, allergies, blood group if known, current medication list if verified.
- QR access is separate from ordinary share and has explicit consent.
- Avoid exposing full history.
**Acceptance:** user can disable/revoke; stale data displays last-updated timestamp.

## F-19 MCP
- Read-only scoped token by default.
- Tools return citations and profile scope.
- Write-like operations only create drafts requiring app confirmation.
**Acceptance:** cross-profile calls fail; tool output is schema validated and audited.

## Global UX acceptance checklist
- Every screen has loading, empty, error, success and permission-denied states.
- No horizontal overflow at 360px viewport.
- Keyboard navigation and visible focus.
- Destructive actions require confirmation.
- Profile identity remains visible in family workflows.
- AI-generated content is labelled and includes sources.

## v3 additions (gaps found in review)
Cost tags: **Free** = no external cost; **AI** = OpenAI tokens, quota-capped (the only paid service).

| ID | Feature | Priority | Cost | Status |
|---|---|---|---|---|
| F-22 | Symptom diary (short notes, severity, date) included in Visit Pack | P1 | Free | Planned (table exists, no API/UI yet) |
| F-23 | Notification channels: Web Push, Telegram bot, email; discreet text; delivery status; honest "may be late" notice | P0 for reminders | Free | Planned |
| F-24 | Escalation chain: push -> Telegram -> caregiver (consented) when a dose is unanswered | P1 | Free | Planned |
| F-25 | Allergies and conditions (user-entered, verification state, last-updated) used by Visit Pack and Emergency Card | P1 | Free | Planned (no table yet) |
| F-26 | Privacy centre: access logs, active shares, linked channels, data export, delete request | P1 (P0 before any pilot) | Free | Planned |
| F-27 | Medication conflict resolver: detect differing strengths/instructions across sources, show sources and dates, ask user to confirm with clinician, keep history | P1 | Free (rules) | Planned |
| F-28 | Doctor visit memory: visit notes, advice given, tests recommended, follow-up date, "last visit vs today" summary | P1 | Free; AI optional | Planned |
| F-29 | Rule-based change detector: what changed since last report, missing tests; neutral wording | P1 | Free | Planned |
| F-30 | Missing-link finder: follow-ups mentioned in documents with no matching later record ("check whether this was done"), user-confirmed | P2 | Free; AI extraction optional | Planned |
| F-31 | Family task board (who refills, who books, who attends) with explicit permissions | P2 | Free | Planned |
| F-32 | Record-completeness indicator (not a health score) | P2 | Free | Planned |
| F-33 | Telegram intake: photo/PDF to bot becomes an unverified document; opt-in; message deleted where possible | P2 | Free + OCR | Planned |
| F-34 | Simple mode (3 big buttons, large text) and EN/BN/HI language switcher | P1 | Free | Planned (extends F-20) |
| F-35 | Medicine course tracker (day 3 of 5) and refill alerts | P1 | Free | Planned |
| F-36 | AI quota indicator and "Improve scan" opt-in vision rescan | P1 | AI | Planned |

Acceptance highlights:
- F-23: reminders sent through `/internal/tick` are idempotent; each attempt has a stored status; opt-out takes effect immediately; no medicine names in default notification text.
- F-27: never silently picks a value; both sources stay visible; resolution is a user choice recorded in audit logs.
- F-29/F-30: wording stays neutral ("changed", "not found in your records"); never states or implies diagnosis or that care was missed.
- F-26: owner can see every share access, revoke any share, export all data, and request deletion.

Dropped or deferred (free-first and safety): WhatsApp Business API reminders (business-started messages are paid), SMS, caregiver burnout monitor, what-if cost planner, drug-interaction flags until a licensed source exists.

## F-37 Quick Reference AI Assistant (v4)
- Provide distinct modes for general reference and personal-record questions.
- Explain medical terms and what tests generally measure using a curated, source-attributed reference catalogue.
- Explain user-selected verified reports and retrieve facts from the active authorised profile.
- Prepare neutral questions for clinician conversations.
- Prefer deterministic lookup and PostgreSQL full-text search; use OpenAI only when generation adds value.
- OpenAI key is backend-only; enforce per-user quotas and a hard monthly spend cap.
- AI outage or quota exhaustion falls back to retrieved excerpts and deterministic record matches.
- Never diagnose, prescribe, triage or recommend medication changes.
**Acceptance:** source links resolve; citations are same-profile; no cross-profile cache leakage; provider fallback works; unsafe output and changed numeric/date/unit content are rejected. See `QUICK_REFERENCE_AI.md`.
