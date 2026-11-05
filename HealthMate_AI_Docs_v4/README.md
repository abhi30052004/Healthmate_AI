# HealthMate AI — Product & Engineering Handbook

**Carry your health, not your paperwork.**

HealthMate AI is a privacy-first personal and family health-record workspace. It converts scattered medical documents into verified, structured health history; helps people understand what their records say; supports medication and appointment routines; and prepares concise, permission-controlled information for clinician conversations.

> **Medical safety statement:** HealthMate AI explains records and supports clinician conversations. It does not diagnose, prescribe, recommend treatment, or replace a qualified healthcare professional. Emergency symptoms require local emergency services, not an AI conversation.

## Product principles
1. **Evidence before explanation:** AI answers are grounded in verified records and cite their sources.
2. **Human verification before automation:** OCR and AI extraction create drafts; the user confirms them.
3. **Private by default:** profiles are isolated, sharing is explicit, time-limited, scoped and revocable.
4. **No silent medical actions:** AI may prepare drafts, but people confirm reminders and changes.
5. **Accessible to families:** simple language, large touch targets, mobile-first flows and regional-language support.
6. **Graceful without AI:** records, trends and user-entered information remain useful when AI is disabled or unavailable.
7. **Honest reliability:** best-effort free-tier notifications are never described as emergency-grade alerts.

## What the product includes
- Account authentication, profile management and caregiver permissions.
- Upload, scan, OCR, extraction review and verified medical records.
- Labs, vitals, medication history, symptoms and appointments.
- Trend charts with units, dates, reference ranges and provenance.
- Medication schedules, dose logs, reminders and refill tracking.
- Doctor Visit Pack, printable summaries and controlled QR sharing.
- Emergency information card with carefully limited fields.
- Citation-based health-record assistant and explain-my-report experience.
- Data-quality centre, duplicate detection, correction history and audit trail.
- Optional Telegram, email and Web Push integrations.
- Optional MCP interface with scoped, read-only access by default.

## Documentation map

| Document | Purpose |
|---|---|
| [PRD.md](PRD.md) | Vision, users, requirements, scope and success metrics |
| [IDEA_ASSESSMENT.md](IDEA_ASSESSMENT.md) | Differentiation, market position, risks and validation |
| [FEATURES.md](FEATURES.md) | Feature catalogue, priorities and acceptance criteria |
| [DESIGN.md](DESIGN.md) | UX, navigation, design tokens and screen specifications |
| [ARCHITECTURE.md](ARCHITECTURE.md) | System context, services, flows and deployment topology |
| [DATABASE.md](DATABASE.md) | Entities, relationships, indexes and data lifecycle |
| [API.md](API.md) | REST conventions, endpoints and payload examples |
| [AUTH.md](AUTH.md) | Authentication, authorization, roles and sharing security |
| [AGENTS.md](AGENTS.md) | Agent workflows, prompts, retrieval and cost management |
| [AGENT_GUARDRAILS.md](AGENT_GUARDRAILS.md) | Enforceable safety controls and red-team tests |
| [INTELLIGENCE_ENGINE.md](INTELLIGENCE_ENGINE.md) | Rule-based change, conflict, gap and completeness engines |
| [QUICK_REFERENCE_AI.md](QUICK_REFERENCE_AI.md) | Quick Reference assistant modes, OpenAI-only generation, retrieval, quotas and safety |
| [MCP.md](MCP.md) | Model Context Protocol server and tool contracts |
| [INTEGRATIONS.md](INTEGRATIONS.md) | OCR, LLM, storage, reminders, email and interoperability |
| [PLAN.md](PLAN.md) | Delivery phases, dependencies and release gates |
| [SETUP.md](SETUP.md) | Windows/PowerShell local development setup |
| [TESTING.md](TESTING.md) | Unit, integration, E2E, security and AI evaluation |
| [DEBUGGING.md](DEBUGGING.md) | Diagnostics and common failure playbooks |
| [SECURITY.md](SECURITY.md) | Threat model, privacy controls and incident response |
| [DEPLOYMENT.md](DEPLOYMENT.md) | Environment configuration and deployment runbook |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Engineering workflow and coding standards |
| [DECISIONS.md](DECISIONS.md) | Architecture decision records and open decisions |
| [GLOSSARY.md](GLOSSARY.md) | Shared product and technical terminology |
| [CHANGELOG.md](CHANGELOG.md) | Documentation and product change history |

## Reference technology direction
- Frontend: React, TypeScript, Vite, Tailwind CSS, accessible component primitives, Recharts.
- Backend: Python, FastAPI, Pydantic, SQLAlchemy, Alembic.
- Database: PostgreSQL (Neon-hosted in the current cloud plan), pgvector where semantic retrieval is enabled.
- AI: provider abstraction, retrieval-augmented generation, strict schemas, citations, quota controls and offline fallback.
- Storage: private object storage (Cloudflare R2 or Supabase Storage) with local development storage.
- Hosting direction: Vercel frontend, Render backend, managed PostgreSQL and external scheduled trigger.
- Quality: pytest, Vitest, Playwright, linting, type checking, dependency and secret scanning.

These are target/reference choices, not a guarantee that every integration is currently configured in every environment. Confirm actual versions and deployment settings in the repository before release.

## Project status and truthfulness
The project has previously implemented core areas including authentication, uploads/OCR/extraction review, health timeline and trends, RAG chat with citations, health summaries, report comparison/export, medications/appointments, knowledge search, archive controls, rate limiting and selected care workflows. The precise state changes as code evolves.

Before marking any capability complete:
1. Locate its frontend route and backend endpoint.
2. Verify database persistence and profile scoping.
3. Run its focused tests.
4. Test loading, empty, error and permission-denied states.
5. Record evidence in the release checklist.

Use `PLAN.md` and the implementation status table in `FEATURES.md` to distinguish shipped, partially implemented and proposed work.

## Safety and launch boundary
Development and demonstrations should use synthetic records. Real patient use requires a privacy, security, consent, legal and regulatory review appropriate to the jurisdictions and integrations involved. This handbook is an engineering specification, not legal or clinical advice.

## v3 notes
This version adds the free-first scheduler/channel details, missing API endpoints and tables, privacy centre, symptom diary, conflict/change engines and competitive context. See CHANGELOG.md.

## v4 AI provider policy

Quick Reference AI is specified in `QUICK_REFERENCE_AI.md`. It reuses the existing assistant/retrieval architecture, prefers deterministic and curated-source lookup, and uses the OpenAI API as the only external generative provider. The API key must remain server-side. AI usage is separately billed and quota-capped; retrieval-only functionality must remain available when generation is disabled. This is a documentation specification, not proof of implementation.
