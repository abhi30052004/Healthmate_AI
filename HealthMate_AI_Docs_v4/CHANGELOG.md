# Changelog

## 2026-11-04 — v3 review fixes
- Added INTELLIGENCE_ENGINE.md (rule-based change, conflict, missing-link, completeness).
- FEATURES: added F-22 to F-36; Visit Pack set to P0; clinician guest clarified as a share session.
- API: added about 25 missing endpoints (symptoms, notification prefs, push/Telegram, access log, emergency card, privacy export/delete, MCP tokens, AI usage, intelligence).
- DATABASE: added allergies, conditions, invitations, emergency_cards, mcp_tokens, jobs, tick_runs, notification_preferences, telegram links, visit_notes, record_links, conflicts, follow-ups, tasks, ai_cache.
- PLAN: QR sharing moved before family access; reminder channels and intelligence phases clarified.
- AUTH/DECISIONS: session and cross-site cookie guidance, ADR-007 to ADR-010.
- SETUP/DEPLOYMENT/TESTING/DEBUGGING: cron, Telegram, VAPID, email, quota, cookie checks.
- DESIGN/SECURITY/IDEA_ASSESSMENT/PRD: notification and privacy screens, DPDP review, Aarogya Setu 2.0 competitive context.

## 2026-11-04 — Documentation baseline expanded
- Consolidated HealthMate AI product vision and safety boundary.
- Expanded PRD, features, design, architecture, database and API specifications.
- Added security, deployment, contribution, decision record and glossary documents.
- Added explicit implementation-status caveat and release gates.
- Clarified synthetic-data-only development and real-patient launch review.

## Historical project milestones (reported in project history)
- Authentication, document upload, OCR and extraction review.
- Timeline, normalised test names and trend charts.
- RAG chat with source citations.
- Health summary/insights.
- Report comparison and PDF/CSV export.
- Medication and appointment workflows.
- Medical knowledge search.
- Archive controls and rate limiting.
- Doctor Visit Pack and smart reminder feature work.
- Premium frontend redesign work.

Historical milestones are not a current verification report. Confirm the current branch, deployment and test results before release.

## 2026-11-04 — v4 Quick Reference AI specification
- Added `QUICK_REFERENCE_AI.md` with six user modes, retrieval-first orchestration, source/citation requirements, fallback behaviour, caching, quotas, safety boundaries and acceptance tests.
- Updated PRD, FEATURES, API, ARCHITECTURE, DATABASE, AGENT_GUARDRAILS, INTEGRATIONS, SETUP, PLAN and README.
- Set OpenAI API as the sole external generative-AI provider for the current scope; deterministic rules and curated PostgreSQL search remain available without generation.
- This is a specification update only. Existing code, endpoints, schema and deployment have not been modified or verified.
