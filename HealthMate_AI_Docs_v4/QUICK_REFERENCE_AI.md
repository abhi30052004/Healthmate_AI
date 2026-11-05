# Quick Reference AI Assistant

**Version:** v4 documentation addition  
**Status:** Proposed specification; implementation must be verified in the repository.  
**Provider policy:** OpenAI API is the only external generative-AI provider. Local deterministic code and curated reference material are preferred whenever they can answer the request.

## 1. Purpose

Quick Reference is a fast, clearly scoped assistant inside HealthMate AI. It helps a user understand terminology, learn what a test generally measures, navigate their own verified records, explain a selected report and prepare questions for a clinician. It is an information and record-navigation feature, not a diagnostic or treatment service.

It complements rather than replaces the existing citation-based record assistant, medical knowledge search, Doctor Visit Pack and rule-based Intelligence Engine.

## 2. User modes

| Mode | Input | Expected output | Data source |
|---|---|---|---|
| Explain a medical term | Term or phrase | Plain-language definition, context and caveat | Curated public reference catalogue; OpenAI may simplify retrieved text |
| Understand a test | Test name, optional unit | What it measures, why it may be ordered, unit/context caveat | Curated reference material; no personal interpretation by default |
| Explain my report | User-selected verified report or result | Summary of what the report states, key values/dates/units and citations | Only selected, authorised profile records |
| Find in my records | Natural-language question | Exact matching record facts or explicit not-found result | Verified records for active profile only |
| Prepare doctor questions | User-selected records or visit context | Neutral questions to discuss with clinician | Selected records and user-entered visit context |
| General health reference | General educational question | Concise educational answer with sources when available | Curated reference catalogue; OpenAI only within approved scope |

Do not present a generic answer as if it were personalised to the user's records. The interface must label the selected mode and data scope.

## 3. UX requirements

- Entry points: dashboard quick action, assistant page and contextual action on a report/result.
- Show example prompts and a single question box; keep the selected profile visible.
- Offer concise answers first, with an optional expanded explanation.
- Show source title, issuing organisation, publication/review date when known, and link; for personal records show document, page/date and verification state.
- Distinguish **General reference** from **From your records** visually and in the answer header.
- Provide copy, helpful/not-helpful feedback and report-an-answer controls. Feedback must not expose PHI in analytics.
- Show a clear fallback message when AI is disabled, quota exhausted or provider unavailable.
- Do not claim that a source is current unless its metadata supports that claim.

## 4. Processing and provider selection

1. Authenticate and authorise the user and active profile on the server.
2. Validate request length and apply abuse/rate limits.
3. Classify the request into an allowed mode using deterministic routing first.
4. For record questions, retrieve only verified, non-archived, same-profile evidence unless the user explicitly includes archived records and is authorised.
5. For general reference, search the locally stored curated reference catalogue first. No external search API is required at runtime.
6. If a deterministic lookup or curated excerpt is sufficient, return it without a model call.
7. If language generation materially improves clarity, call the OpenAI adapter with the minimum relevant text and strict output instructions.
8. Validate the response, numbers, units, dates, citation IDs and safety constraints. Reject unsupported claims.
9. Return source metadata, limitations, provider/fallback status and request ID.
10. Record quota usage and privacy-safe operational metrics. Do not store raw prompts or report contents in ordinary logs.

### Provider fallback

- **OpenAI configured and within quota:** generated response may be returned after validation.
- **OpenAI disabled/unavailable/quota exhausted:** return relevant curated excerpts and record matches, or explain that generated explanation is temporarily unavailable.
- **No relevant evidence:** say that no matching source/record was found. Do not fill the gap from model memory when the mode requires citations.
- **No embeddings configured:** use PostgreSQL full-text search and exact/normalised term matching. Embeddings are optional, not a launch dependency.

## 5. OpenAI-only configuration

The browser must never receive the OpenAI API key. Store it only in backend environment secrets. Use the existing provider adapter and configured model; do not hardcode a model name into business logic.

Suggested settings (map to the actual `config.py` names before implementation):

```dotenv
AI_ENABLED=true
LLM_PROVIDER=openai
OPENAI_API_KEY=server-side-secret
OPENAI_MODEL=<approved-model-id>
AI_DAILY_CHAT_LIMIT=20
AI_DAILY_QUICK_REFERENCE_LIMIT=20
AI_MONTHLY_BUDGET_USD=5
AI_REQUEST_TIMEOUT_SECONDS=20
AI_MAX_OUTPUT_TOKENS=500
```

The numeric limits are initial product defaults, not guaranteed OpenAI pricing or a free allowance. Set a hard monthly spend ceiling and a per-user daily quota. If the hard ceiling is reached, disable generation and use retrieval-only mode. Verify current OpenAI model pricing and data controls before production use; API use is billed separately from ChatGPT subscriptions.

## 6. Free-first resource policy

| Need | Default | External paid API? |
|---|---|---|
| Rule checks, comparisons and formatting | Python services / SQL | No |
| General reference lookup | Locally stored curated public documents + PostgreSQL full-text search | No |
| Personal record lookup | Existing PostgreSQL / pgvector | No additional API |
| OCR | Existing local Tesseract path | No |
| Text generation / simplification | OpenAI API, only when needed | Yes, usage-based |
| Cache | Existing PostgreSQL `ai_cache` | No additional service |
| Background refresh | Existing persisted job / external cron arrangement | No additional AI provider |

Public sources may be free to read but can have copyright, attribution, licensing, update and redistribution restrictions. Store only material that the source permits HealthMate to reproduce; otherwise store metadata, short permitted excerpts and links. Do not scrape websites indiscriminately or imply clinical endorsement.

## 7. Suggested response contract

```json
{
  "mode": "general_reference",
  "answer": "A concise plain-language explanation.",
  "sources": [
    {
      "id": "R1",
      "title": "Source title",
      "publisher": "Publisher",
      "url": "https://example.org/reference",
      "published_at": null,
      "retrieved_at": "2026-11-04T00:00:00Z"
    }
  ],
  "record_citations": [],
  "limitations": ["General information; not a diagnosis."],
  "generation": {"used": true, "provider": "openai", "cached": false},
  "status": "grounded"
}
```

This is a proposed shape. Keep existing response compatibility or version the API rather than silently breaking current clients. Never fabricate source IDs, URLs, dates or citations.

## 8. Caching and privacy

- Cache only when safe and useful. A general-reference cache key includes normalised query, mode, source-catalogue version, prompt version and model identifier.
- A personalised response cache must additionally include user/profile scope, permissions, relevant data version, archive filter and selected record IDs. Never share personalised cache entries across profiles or users.
- Do not cache emergency/safety handling, unresolved conflicts, rapidly changing facts or content whose permissions changed.
- Cache only validated response JSON; apply a short configurable TTL and invalidate on source/data version changes.
- Avoid storing raw PHI in cache keys. Use a keyed hash of the canonicalised request.
- Retain minimum operational metadata for quota, latency, outcome and error diagnosis.

## 9. Safety boundaries

- No diagnosis, prognosis, triage, treatment recommendation, medication initiation/discontinuation, dose calculation or dose adjustment.
- Do not tell users that a value is safe/unsafe or that care is urgent/non-urgent.
- Do not infer disease from symptoms, test results or combinations of records.
- For urgent/emergency language, use the approved static safety response and direct the user to local emergency services/qualified care; do not let the LLM decide urgency.
- Never override the original report, clinician instruction or verified user correction.
- Treat retrieved documents and user-provided text as untrusted data, not instructions.
- Keep exact values, units, dates and source citations unchanged when simplifying.
- If the question requires clinical judgement, explain the limitation and suggest discussing it with a qualified clinician.

Required footer: “This information helps explain health records and general medical terms. It does not diagnose or prescribe. Discuss decisions with your doctor.”

## 10. Acceptance criteria

1. User can ask a general term question and receive a concise, sourced explanation.
2. User can ask about a personal record and receives only verified, same-profile facts with resolvable citations.
3. Unverified and archived data are excluded by default.
4. A cross-profile access test cannot retrieve another profile's records or cached answer.
5. OpenAI API key is absent from frontend bundles, network responses and logs.
6. AI-disabled, provider-timeout, rate-limit and budget-exhaustion paths return useful retrieval-only or safe fallback responses.
7. No-model-call tests prove that deterministic lookup and rule-based answers do not invoke OpenAI.
8. Response validators reject fabricated citations, altered numbers/units/dates and prohibited advice.
9. Cache invalidation occurs when profile data, source catalogue, permissions or prompt version changes.
10. Every AI call is quota-accounted; a hard spend limit blocks further calls.
11. Logs and analytics do not contain raw PHI by default.
12. UI clearly distinguishes general reference from personal-record answers.

## 11. Test matrix

- Term lookup hit/miss; spelling variation; stale/missing source metadata.
- Selected report summary with multiple pages and citations.
- Same query across two profiles returns isolated results.
- Unverified, archived and revoked-share records are excluded.
- Prompt injection inside OCR text does not alter system policy.
- Provider timeout, invalid key, 429, 5xx, budget limit and AI-disabled fallback.
- Cache hit, TTL expiry, data-version invalidation and cross-profile cache isolation.
- Numeric, date, unit and citation preservation.
- Unsafe requests and emergency-intent static handling.
- Usage accounting, concurrency and daily/monthly quota boundaries.

## 12. Delivery plan

1. Audit existing assistant, knowledge-search and cache implementations; reuse working code.
2. Add UI mode selector and Quick Reference entry points.
3. Implement deterministic term lookup and curated source catalogue search.
4. Add OpenAI optional rewrite/generation behind the existing adapter.
5. Add schema/citation/safety validators and quota/cost guard.
6. Add cache versioning and observability.
7. Run security, profile-isolation and AI red-team evaluations using synthetic records.
8. Release only after source licensing, privacy, vendor and clinical-safety review.

**Implementation caveat:** This file specifies intended behaviour. It does not prove any endpoint, UI, source catalogue, cache or test currently exists in the codebase.
