# Changelog

## 2026-11-06 (c) — Landing, login and register redesign
- **Landing page rebuilt from scratch.** Hand-drawn SVG/React artwork instead of stock images: a hero phone with a live heartbeat and mouse-parallax floating cards (report read, doctor QR, dose ring, cited AI answer), a document-scan demo, an interactive trend chart (3M/6M/1Y and a table view), a tappable dose tracker, a typing assistant demo with citations, a family-profile switcher, a QR-sharing demo (real QR code, scope toggles, revoke), animated privacy shield, scroll-linked "how it works" and FAQ.
- **Login, register, forgot- and reset-password** share a new split layout with animated artwork. Form logic and labels are unchanged.
- Motion respects `prefers-reduced-motion`. Layout verified at 1440px and 390px with no horizontal overflow.
- **Copy corrected:** removed claims the product could not back up (PIN-protected links, push/Telegram reminders). FAQ now states that extraction can misread values and that reminders are in-app plus optional email.
- Tests: landing unit tests and two browser checks rewritten for the new page; `src/test/setup.ts` stubs `IntersectionObserver`/`ResizeObserver` for jsdom. 164 frontend unit tests and 63 browser tests pass.

## 2026-11-06 (b) — Password reset and public emergency QR
- **Password reset by email:** `POST /auth/forgot-password` (always answers the same, email sent in the background so timing doesn't reveal accounts) and `POST /auth/reset-password`. Tokens are 256-bit, stored hashed, single-use, expire after 30 minutes, and a new request voids older links. Web pages `/forgot-password` and `/reset-password`. **Needs SMTP configured in production** (`SMTP_*`, `FRONTEND_BASE_URL`); in development without SMTP the link is written to the server log.
- **Public emergency card QR:** off by default. The owner turns it on per profile (`POST /family-profiles/{id}/emergency-link`), prints/scans a QR to `/e/:token`, can replace it (old printed QR stops working) or turn it off. The public endpoint `GET /emergency/{token}` returns only name, age, blood type, allergies, conditions and emergency contact, with `no-store` and `noindex` headers and rate limiting.
- **Schema (migration `b8c9d0e1f2a3`, additive):** `password_reset_tokens` table, `family_profiles.emergency_token`. **Apply with `alembic upgrade head`.**
- `.env.example` now documents the Groq/OpenAI settings (the old `MEDICAL_CHAT_*` variables are no longer read).
- **Still not implemented:** caregiver invitations and roles (needs per-profile authorization across every data endpoint), push/Telegram channels, MCP server, rotating HttpOnly refresh cookie.
- **Verification:** 228 backend tests, 161 frontend tests, 42 desktop browser tests (incl. the reset and emergency-QR journeys).

## 2026-11-06 — Groq AI enabled; shared-view fix
- **AI:** one LLM client (`backend/app/services/llm.py`) now serves the assistant chat, Quick Reference and the "LLM-assisted" health summary. Groq is used automatically when a key is configured (`GROQ_API_KEY`, or the existing `grok_api`), default model `openai/gpt-oss-120b`; OpenAI still works via `OPENAI_API_KEY`; `LLM_PROVIDER=none` forces the deterministic offline engine. Any provider failure, empty reply or exhausted daily quota falls back to the offline engine. Model citations are normalised (`【S1】`, `[**S1**]`, `[S1, S2]`) and directive treatment language is stripped. TLS uses the OS trust store so it works behind corporate TLS-inspection proxies.
- **Fix:** doctor QR link returned HTTP 500 when appointments were shared (read non-existent appointment fields).
- **Verification:** 222 backend tests, 154 frontend tests, 19-step real-browser journey, plus a 65-check API smoke (auth, family profiles, PDF/scan extraction, meds/doses, appointments, symptoms, exports, Groq chat/quick-reference/summary, QR share/revoke, cross-user isolation).

## 2026-11-05 — Frontend wired to the real backend; missing features built
**Implementation update (code, not just docs).** Verified by 217 backend tests, 154 frontend unit tests, a 19-step real-API browser journey and per-page layout/accessibility checks (see `frontend/README.md` section 11).

- **Frontend:** every screen now reads/writes the real API (previously the rebuilt UI ran on hard-coded sample data and a fake token). Route guard, real sign-in/sign-up, server-driven profiles, profile-scoped caches.
- **Records:** upload with live processing status, original-file preview beside extracted values, edit/reject/add results (persisted), verify, manual entry for labs and vitals with date and time.
- **Medications:** per-medication dose times and weekdays, daily dose schedule, taken/skipped/snoozed with undo, 7-day adherence summary.
- **Appointments:** calendar, date/time picker, preparation checklist (backed by follow-up tasks), optional reminder.
- **Symptom diary, visit pack (with symptoms, per-row include/exclude, PDF), assistant (real RAG with citations + medical-term lookup), family profiles CRUD, doctor sharing (one-time link + QR, access log, revoke), emergency card, privacy centre (duplicate scan, export, account deletion), reminders and an in-app notification bell, global search.**
- **New backend endpoints:** `POST /auth/refresh`; `PATCH /account`, `GET /account/export`, `POST /account/delete`; `POST /documents/manual-entry`, `POST|DELETE /documents/{id}/observations[/{obs}]`; `GET /care/doses`, `POST /care/dose-logs`, `DELETE /care/dose-logs/{id}`, `GET /care/adherence`; `GET|POST /symptoms`, `PATCH|DELETE /symptoms/{id}`.
- **Schema (migration `a7b8c9d0e1f2`, additive):** `care_medications.schedule_times/schedule_days`, `family_profiles.conditions_summary`, tables `care_dose_logs` and `symptom_entries`. **Apply with `alembic upgrade head` before running the new backend.**
- **Fixes:** demo-account auto-provisioning limited to `APP_ENV=development`; quick-reference 500 responses no longer echo exception text; document deletion works for records with no stored file; share links point at the web route `/s/:token`; landing-page claims that the product could not back up were removed.
- **Not implemented:** password reset by email, push/Telegram/email channels as account settings, caregiver invitations and roles, public emergency-card QR, MCP server. Access tokens use sliding renewal (`/auth/refresh`) rather than the rotating HttpOnly refresh cookie recommended in AUTH.md/ADR-007; revisit before real-user launch.


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
