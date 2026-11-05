# Architecture Decision Records and Open Decisions

Use this file to record material decisions. Each decision should include context, options, decision, consequences, date and owner.

## ADR-001: Personal/family record workspace, not AI doctor
**Decision:** HealthMate organises records and supports clinician conversations. It does not diagnose or prescribe.  
**Reason:** Reduces unsafe scope and clarifies user expectations.  
**Consequence:** Medical claims and actions require strict boundaries.

## ADR-002: PostgreSQL as source of truth
**Decision:** Use managed PostgreSQL; pgvector is an optional retrieval index.  
**Reason:** Relational integrity, transactions, migrations and flexible search.  
**Consequence:** Schema and migrations require discipline; vector index must be rebuildable.

## ADR-003: Human verification before clinical facts
**Decision:** OCR/LLM output remains unverified until user review.  
**Reason:** Extraction is fallible and source context matters.  
**Consequence:** UI must support field-level review and correction.

## ADR-004: AI provider abstraction
**Decision:** Hide provider-specific calls behind an adapter.  
**Reason:** Cost, availability and model changes.  
**Consequence:** Maintain provider contract tests and model evaluation.

## ADR-005: Private object storage
**Decision:** Original reports are stored in private object storage; access is mediated by backend.  
**Reason:** Health documents must not have public permanent URLs.  
**Consequence:** Signed URL expiry and object lifecycle need testing.

## ADR-006: Free-first hosting is not reliability-grade
**Decision:** Free tiers may be used for demo and early development only.  
**Reason:** Sleep, quotas and resource caps affect OCR and reminders.  
**Consequence:** Production reliability may require paid infrastructure.

## Open decisions
- Browser session strategy: proposed in ADR-007; confirm after a cross-site cookie test on iOS Safari.
- Exact retention and deletion schedule.
- Approved canonical lab terminology and unit conversion references.
- Share PIN and clinician identity verification policy.
- Background job architecture: DB-backed polling vs managed queue.
- Production hosting region and data residency.
- Whether to support ABDM/ABHA and under which approved integration model.

## ADR-007: Session strategy (proposed)
**Decision:** Short-lived access token held in memory; rotating refresh token in an HttpOnly Secure SameSite cookie with reuse detection.  
**Reason:** Avoid long-lived tokens in browser storage.  
**Consequence:** Frontend and API should share a parent domain or use a same-origin proxy; otherwise cookies may fail in some browsers.

## ADR-008: Rule-based intelligence before agents
**Decision:** Change detection, conflict detection, missing-link candidates and completeness are deterministic services. The LLM only extracts text and writes wording.  
**Reason:** Cheaper (OpenAI is the only paid service), testable, safer.  
**Consequence:** Single AI orchestrator plus normal services; no multi-agent mesh in MVP.

## ADR-009: No WhatsApp or SMS in MVP
**Decision:** Reminders use Web Push, Telegram and email.  
**Reason:** Business-started WhatsApp messages are paid; unofficial libraries break terms and risk bans; SMS needs paid gateways and registration.  
**Consequence:** Revisit only if funding exists.

## ADR-010: Clinician guest is a share session, not an account
**Decision:** Guests never get a user or membership record.  
**Consequence:** All guest access goes through share tokens, PIN, scope, expiry and audit.
