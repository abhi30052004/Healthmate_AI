# Product Requirements Document

**Product:** HealthMate AI  
**Document status:** Product specification / evolving baseline  
**Primary market hypothesis:** Individuals and families who need a reliable way to organise personal health records and prepare for clinician visits.

## 1. Executive summary
Health information is fragmented across paper reports, PDFs, photographs, hospital portals, prescriptions, email and family messaging applications. People often cannot quickly retrieve a previous result, understand whether two reports refer to the same test, or prepare a concise history for a doctor. Caregivers may coordinate records for several family members, creating additional privacy and access-control risks.

HealthMate AI provides one structured, profile-based workspace. It digitises documents, extracts candidate facts, asks a human to verify them, presents longitudinal history and helps prepare clinician-facing summaries. AI is an evidence-navigation assistant, not a clinical decision-maker.

## 2. Problem statement
- Records are scattered and difficult to search.
- OCR and manual re-entry create errors and duplicate records.
- A value without its date, unit, source or context can be misleading.
- Family caregivers need access without unrestricted account sharing.
- Clinician appointments are short; patients forget questions and relevant history.
- Generic AI chat can hallucinate or mix records unless retrieval and permissions are constrained.
- Reminder delivery is unreliable if it depends on a sleeping free-tier service.

## 3. Vision and positioning
**Vision:** A trustworthy personal health-history layer that makes a person's own records easier to organise, understand and share.

**Positioning:** Personal/family health-record organisation and clinician-visit preparation, not a hospital EHR, telemedicine service, diagnosis engine or medication prescriber.

**Product promise:** Find the right record, understand what it says, and share only what you choose.

## 4. Goals and measurable outcomes
| Goal | Metric | Initial target |
|---|---|---:|
| Fast onboarding | Time to first verified record | under 5 minutes |
| Extraction usefulness | Correct extracted fields after human review | at least 90% on synthetic evaluation set |
| Findability | Search success on seeded tasks | at least 90% |
| Visit preparation | Time to create a useful Visit Pack | under 2 minutes |
| Privacy | Cross-profile access leaks in automated suite | 0 |
| Sharing control | Revocation blocks next request | 100% |
| Reliability | Reminder duplicate sends in idempotency tests | 0 |
| AI grounding | Factual AI claims with valid same-profile citation | 100% in release eval |
| Accessibility | Critical flows keyboard-operable | 100% |

Targets are product hypotheses. Validate them with usability tests; do not present them as achieved metrics without measurement.

## 5. Users and jobs-to-be-done
### Patient
- Keep lab reports, prescriptions and visit notes together.
- Find the latest result and compare it with earlier results.
- Prepare questions for a doctor.
- Share selected history for a limited period.

### Caregiver
- Switch between authorised family profiles.
- Help organise a parent's records and routines.
- See only the information granted by the profile owner.
- Receive only consented, discreet reminders or escalation messages.

### Family profile owner
- Invite or remove a caregiver.
- Review access and revoke it.
- Correct extracted information and inspect its source.

### Clinician guest
- Open a time-limited, read-only share.
- Understand dates, units, source documents and verification status quickly.
- Download or print only the authorised summary, if enabled by the share scope.

### Administrator / support operator
- Monitor service health, abuse and quota metrics.
- Never browse patient content by default.
- Access synthetic/demo tenants for troubleshooting.

## 6. Product principles
- Verified data is visually distinct from extracted/unverified data.
- No AI-generated measurement is silently saved as a clinical fact.
- No default public profile or discoverable health record.
- Sharing is explicit, narrow, expiring and revocable.
- No AI-triggered medicine, share, delete or emergency action.
- Plain-language explanations preserve the original value and unit.
- The product remains useful when the model provider is unavailable.

## 7. Scope
### MVP baseline
- Account registration, login, logout and session lifecycle.
- Personal health profiles and profile switching.
- Document upload, file validation, OCR and extraction review.
- Verified lab results and vitals with provenance.
- Timeline, search and basic trend visualisations.
- Medication list, appointment list and manual entries.
- Citation-based assistant limited to active profile records.
- Doctor Visit Pack preview/export.
- Audit events for sensitive actions.

### Next release candidates
- Caregiver roles and family invitations.
- Reminder scheduling, dose logging and channel preferences.
- Time-limited QR doctor sharing with PIN/rate limiting/revocation.
- Duplicate detection and data-quality centre.
- Emergency card with explicit consent and minimal fields.
- Bengali/Hindi/English localisation and accessibility improvements.
- MCP read-only tools with scoped tokens.

### Explicitly out of scope unless separately approved
- Diagnosis, treatment plans, prescribing, dosage adjustment or medication substitution.
- Automated interpretation of symptoms as a medical triage service.
- Emergency response guarantees.
- Direct hospital EHR writes.
- Public social health profiles.
- Unconsented family monitoring.
- Real-patient launch before security, privacy and regulatory assessment.

## 8. Functional requirements
### Identity and profiles
- FR-001: A user can register, authenticate and terminate their own session.
- FR-002: A user can create and update permitted health profiles.
- FR-003: Every profile-scoped request is authorised server-side.
- FR-004: A user can switch active profiles without retaining stale data from the previous profile.
- FR-005: Caregiver access is explicit, role-scoped and revocable.

### Documents and extraction
- FR-010: Accept only configured file types and size/page limits.
- FR-011: Store originals privately; expose downloads through authorised short-lived access.
- FR-012: Track upload, OCR, extraction, review and failure states.
- FR-013: Extraction produces a draft with field-level confidence and source location where possible.
- FR-014: User can accept, edit or reject each extracted item.
- FR-015: Only verified items are used as factual inputs to trends and AI answers by default.
- FR-016: Duplicate candidates are detected without automatically deleting or merging records.

### Health records and trends
- FR-020: Store test name, canonical name, value, unit, collection date, reference range, lab/source and verification state.
- FR-021: Preserve the original value/unit even when a normalised comparison is available.
- FR-022: Display chronological values and clearly label missing, incomparable or unverified data.
- FR-023: Never compare incompatible units without a validated conversion rule.
- FR-024: Allow manual vitals with date/time and context.

### Medications and reminders
- FR-030: Medication records preserve source and verification status.
- FR-031: Schedule creation/edit is confirmed by the user.
- FR-032: Dose logs support taken, skipped, snoozed and unknown states.
- FR-033: Reminder channels are opt-in and configurable.
- FR-034: Notifications use discreet text by default.
- FR-035: Reminder service is idempotent and reports delivery uncertainty honestly.

### AI assistant
- FR-040: Retrieve only from the authenticated user's authorised active profile.
- FR-041: Cite every record-derived factual claim.
- FR-042: If evidence is missing, say it was not found.
- FR-043: Refuse diagnosis, prescribing and dose-change requests.
- FR-044: Detect emergency indicators before ordinary model processing.
- FR-045: Enforce per-user and global quotas with offline fallback.
- FR-046: Treat document text and external tool output as untrusted data.

### Sharing
- FR-050: User selects profile, categories, date range and expiry before creating a share.
- FR-051: QR contains an opaque random token or URL, never medical data or profile identifiers.
- FR-052: Share can be revoked immediately.
- FR-053: Guest view is read-only and access is logged.
- FR-054: Expired/revoked links fail closed.

## 9. Non-functional requirements
- Security: least privilege, secure cookies or carefully managed tokens, TLS, secret management, rate limiting.
- Privacy: minimum necessary data, consent records, redacted logs, retention and deletion workflows.
- Performance: paginated APIs; initial dashboard should avoid loading every document.
- Reliability: retries only for idempotent operations; job state persisted.
- Accessibility: WCAG-informed contrast, keyboard access, labels, focus visibility and zoom.
- Maintainability: typed schemas, migrations, service/repository boundaries and documented API contracts.
- Portability: provider abstractions for LLM, OCR, storage and messaging.
- Observability: structured logs, metrics and correlation IDs without PHI.

## 10. Core journeys
1. Register → create profile → upload report → review extraction → verify → view timeline.
2. Open a lab result → inspect source document → compare prior verified results.
3. Ask assistant a record question → inspect citations → open source.
4. Prepare Visit Pack → review included sections → export/print.
5. Create share → choose scope/expiry/PIN → show QR → clinician reads → owner revokes.
6. Add medication → confirm schedule → receive reminder → log dose.
7. Invite caregiver → accept invitation → access permitted profile → owner revokes.

## 11. Acceptance and release gates
A feature is complete only when its backend, persistence, profile isolation, UI states, accessibility, audit events and focused tests are complete. See `FEATURES.md`, `TESTING.md` and `PLAN.md`.

## 12. Open product questions
- Which countries and regulatory regimes are in scope for the first real-user pilot?
- What is the approved data retention and deletion policy?
- Which reminder channels are supportable at the reliability level users expect?
- Should clinician guest access require a PIN, verified professional identity, or both?
- Which canonical terminology and lab-unit conversion sources will be maintained?

## 13. v3 additions
- Reminder channels are free-first: Web Push, Telegram, email. WhatsApp and SMS are excluded from the MVP (ADR-009).
- Additional requirements: FR-060 users can keep a symptom diary; FR-061 allergies/conditions are user-entered with verification state; FR-062 users can export all data and request deletion; FR-063 conflicting medication records are shown with sources and never silently resolved; FR-064 notification attempts have visible delivery status; FR-065 guests have no account (share session only).
- Visit Pack is MVP (F-13 is P0) to match section 7.
- Success metric added: share revoke blocks the next guest request 100% of the time; reminder attempts show an honest status 100% of the time.
- Validation first: 8-12 user interviews before building Phases 4 onward.

## Quick Reference AI requirement (v4 addition)

Users should be able to get a concise explanation of common medical terms, understand what a test generally measures, inspect a selected verified report, find facts in their own verified records and prepare neutral clinician questions. General reference must be distinguished from personal-record answers. The feature must remain useful without model access through deterministic lookup and curated reference retrieval. OpenAI API is the sole external generative provider under a hard quota and spend cap. See `QUICK_REFERENCE_AI.md` for detailed requirements and acceptance criteria.
