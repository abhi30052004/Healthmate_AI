# Product and Engineering Roadmap

## Delivery rule
One phase at a time. A phase is complete only when acceptance criteria, tests, security checks and documentation are updated. Do not interpret roadmap inclusion as implementation completion.

| Phase | Scope | Exit criteria |
|---|---|---|
| 0 | Foundation, repo, environments, DB, migrations, CI | Fresh setup works; migration head matches |
| 1 | Auth, profiles, access control | Isolation suite passes |
| 2 | Documents, OCR, extraction review | Upload-to-verified-record journey works |
| 3 | Timeline, labs, vitals and trends | Correct units, dates, source links |
| 4 | Assistant, RAG and guardrails | Citation and red-team evals pass |
| 5 | Insights, report comparison and exports | Profile-scoped, traceable exports |
| 6 | Medications, appointments and Visit Pack | User-confirmed data and useful preview |
| 7 | Reminders and dose logs (Web Push, Telegram, email via `/internal/tick`) | Idempotent delivery, stored delivery status, opt-out tested |
| 8 | QR sharing and emergency card (owner-only, no caregiver dependency) | Scope, expiry, PIN, revoke and access log verified |
| 9 | Family memberships and caregiver access | Role matrix and revocation tests pass |
| 10 | Data quality, conflict resolver, change detector, visit memory | No destructive auto-merge; conflicts never silently resolved |
| 11 | MCP and external integrations | Scoped token and audit tests pass |
| 12 | Accessibility, localisation and PWA | Usability and accessibility checks |
| 13 | Hardening and pilot readiness | Security review, backups, restore, incident plan |

## Current known project baseline
Previous project work reported:
- Auth, upload/OCR/extraction/review.
- Timeline and trend charts.
- RAG chat with citations.
- Health insights/summary.
- Report comparison and PDF/CSV export.
- Medication and appointment workflows.
- Medical knowledge search.
- Archive controls and rate limiting.
- Doctor Visit Pack and reminder-related work.
- Family profiles and secure sharing were part of the planned feature set.

This is historical context, not a fresh code audit. Check the repository and update status before assigning a phase.

## Priority order for next engineering work
1. Audit profile isolation across every endpoint, especially insights, comparison, export, care overview and calendar.
2. Confirm production migration head and backup/restore process.
3. Confirm private object storage and upload limits.
4. Verify refresh-session revocation and account lifecycle.
5. Verify reminder delivery end-to-end; never rely on a free sleeping service for critical alerts.
6. Complete QR share security tests.
7. Complete data-quality and duplicate review.
8. Complete frontend responsive/accessibility pass.
9. Run AI red-team and citation evaluation.
10. Prepare synthetic demo tenant and release checklist.

## Release gates
### Internal demo
- Synthetic data only.
- No public access to real patient data.
- All critical flows manually demonstrated.
- Known limitations visible.

### Private pilot
- Security/privacy/legal review completed.
- Consent, deletion, export and incident workflows tested.
- Monitoring and backups active.
- Clear support and escalation process.
- User expectations for reminder reliability explicit.

### Public launch
- Applicable regulatory requirements assessed by qualified counsel/compliance professionals.
- Vendor terms and data processing agreements reviewed.
- Penetration test / independent security review.
- Operational ownership, support, disaster recovery and budget approved.

## AI budget guard
- Per-user daily limits by operation.
- Global monthly spend cap with hard stop.
- Cache only where profile/data version makes it safe.
- Trim history and retrieve minimal evidence.
- One retry maximum.
- Provider outage → retrieval-only mode.
- Vision only after explicit user opt-in.

## v3 notes
- **Why QR moved before family access:** QR doctor sharing and Visit Pack are core user value and need only the owner role.
- **Free-first scheduler:** an external cron calls `/internal/tick`; it also keeps the sleeping free backend awake. Delivery is best-effort (see ADR-006).
- **Added work items:** symptom diary (F-22), allergies/conditions (F-25), privacy centre with export/delete (F-26) before any pilot, notification settings UI.
- **Validation step before Phase 4:** 8-12 interviews with patients/caregivers using mockups (see IDEA_ASSESSMENT.md).
- **Rule-based first:** change detection, conflicts, gaps and completeness are deterministic (see INTELLIGENCE_ENGINE.md); AI only wraps wording and extraction.

## v4 Quick Reference AI work

Add a scoped workstream after the existing assistant/RAG audit: (1) audit current assistant and knowledge-search code; (2) add curated reference metadata and deterministic full-text search; (3) build Quick Reference UI modes; (4) connect optional OpenAI generation via existing adapter; (5) implement citation/output validation, quotas, hard spend cap and privacy-safe cache; (6) run fallback, prompt-injection, numeric-preservation and cross-profile isolation tests. Do not mark complete until the acceptance criteria in `QUICK_REFERENCE_AI.md` pass. OpenAI API is usage-billed; retrieval/rules should remain usable with AI disabled.
