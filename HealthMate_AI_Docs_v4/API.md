# API Contract

Base path: `/api/v1` unless an existing router uses a different prefix. Confirm actual route names in the running OpenAPI schema before treating this as an implementation inventory.

## 1. Conventions
- JSON request/response unless upload/download.
- ISO-8601 timestamps with timezone offsets at boundaries; UTC persistence.
- UUID identifiers.
- Pagination: `limit` (bounded) and `cursor` or `offset`.
- Errors use stable machine-readable `code`, safe `message`, optional `request_id`.
- Authenticated endpoints require the configured session mechanism.
- Profile access is resolved and checked server-side on every request.

### Error shape
```json
{
  "error": {
    "code": "PROFILE_ACCESS_DENIED",
    "message": "You do not have access to this profile.",
    "request_id": "req_..."
  }
}
```

Common status codes: 400 validation, 401 unauthenticated, 403 forbidden, 404 not found (including inaccessible resources where enumeration risk exists), 409 conflict, 413 upload too large, 422 schema validation, 429 rate limit, 500 unexpected error, 503 dependency unavailable.

## 2. Authentication
| Method | Path | Purpose |
|---|---|---|
| POST | `/auth/register` | Create account |
| POST | `/auth/login` | Authenticate |
| POST | `/auth/refresh` | Rotate session/token |
| POST | `/auth/logout` | Revoke current session |
| POST | `/auth/password/forgot` | Start recovery |
| POST | `/auth/password/reset` | Complete recovery |

Example login:
```json
{"email":"demo@example.test","password":"example-only"}
```
Response fields should include access/session metadata without exposing password hashes or internal secrets.

## 3. Profiles
| Method | Path | Purpose |
|---|---|---|
| GET | `/profiles` | List accessible profiles |
| POST | `/profiles` | Create profile |
| GET | `/profiles/{profile_id}` | Read permitted profile |
| PATCH | `/profiles/{profile_id}` | Update permitted fields |
| POST | `/profiles/{profile_id}/archive` | Archive profile |
| GET | `/profiles/{profile_id}/members` | List memberships |
| POST | `/profiles/{profile_id}/invitations` | Invite caregiver |
| DELETE | `/profiles/{profile_id}/members/{member_id}` | Revoke membership |

## 4. Documents
| Method | Path | Purpose |
|---|---|---|
| POST | `/profiles/{profile_id}/documents` | Multipart upload |
| GET | `/profiles/{profile_id}/documents` | List/filter documents |
| GET | `/documents/{document_id}` | Metadata/detail |
| GET | `/documents/{document_id}/content` | Authorised original/preview |
| POST | `/documents/{document_id}/process` | Queue/retry processing |
| GET | `/documents/{document_id}/extractions` | Candidate fields |
| PATCH | `/extractions/{item_id}` | Edit candidate |
| POST | `/extractions/{item_id}/verify` | Confirm candidate |
| POST | `/extractions/{item_id}/reject` | Reject candidate |
| POST | `/documents/{document_id}/archive` | Archive |

Upload must enforce MIME signature, size/page limits and profile permissions. Do not trust the filename or browser-provided MIME alone.

## 5. Health records
| Method | Path | Purpose |
|---|---|---|
| GET | `/profiles/{profile_id}/labs` | List lab results |
| POST | `/profiles/{profile_id}/labs` | Manual lab entry |
| GET | `/profiles/{profile_id}/vitals` | List vitals |
| POST | `/profiles/{profile_id}/vitals` | Manual vital entry |
| GET | `/profiles/{profile_id}/timeline` | Unified timeline |
| GET | `/profiles/{profile_id}/trends/{metric}` | Metric history |
| GET | `/profiles/{profile_id}/search` | Search records |
| GET | `/profiles/{profile_id}/data-quality` | Review data issues |

Trend response should preserve provenance:
```json
{
  "metric": "HbA1c",
  "unit": "%",
  "points": [
    {
      "value": 6.4,
      "collected_at": "2026-04-12T09:00:00+05:30",
      "verification_status": "verified",
      "source": {"document_id": "uuid", "page": 1}
    }
  ],
  "reference_range": null
}
```
Illustrative payload only; do not invent a reference range if none exists.

## 6. Medications and appointments
| Method | Path | Purpose |
|---|---|---|
| GET/POST | `/profiles/{profile_id}/medications` | List/create |
| PATCH | `/medications/{id}` | Update |
| POST | `/medications/{id}/confirm` | Confirm record |
| GET/POST | `/profiles/{profile_id}/appointments` | List/create |
| PATCH | `/appointments/{id}` | Update |
| POST | `/appointments/{id}/complete` | Mark completed |
| GET | `/profiles/{profile_id}/dose-logs` | Dose history |
| POST | `/dose-logs` | Record user action |

## 7. Assistant and visit pack
| Method | Path | Purpose |
|---|---|---|
| POST | `/profiles/{profile_id}/assistant/query` | Ask record question |
| POST | `/profiles/{profile_id}/assistant/explain` | Explain selected record |
| POST | `/profiles/{profile_id}/visit-packs/preview` | Build preview |
| POST | `/profiles/{profile_id}/visit-packs/export` | Export approved pack |
| POST | `/profiles/{profile_id}/knowledge/search` | Search curated knowledge |

Assistant response:
```json
{
  "answer": "Your latest verified HbA1c result in this profile is 6.4%.",
  "citations": [
    {"id":"S1","document_id":"uuid","page":1,"date":"2026-04-12"}
  ],
  "limitations": ["This explains the records and is not a diagnosis."],
  "status": "grounded"
}
```
The exact answer is illustrative. The backend must validate every citation against retrieved evidence.

## 8. Sharing
| Method | Path | Purpose |
|---|---|---|
| POST | `/profiles/{profile_id}/shares` | Create scoped share |
| GET | `/profiles/{profile_id}/shares` | List active/recent shares |
| POST | `/shares/{share_id}/revoke` | Revoke |
| POST | `/share/{opaque_token}/verify` | Verify PIN |
| GET | `/share/{opaque_token}/summary` | Guest read-only view |
| GET | `/share/{opaque_token}/records` | Scoped records |

Public share routes require separate rate limits, expiry checks and no profile enumeration.

## 9. Reminders and internal jobs
| Method | Path | Purpose |
|---|---|---|
| POST | `/profiles/{profile_id}/reminders` | Create draft/reminder |
| PATCH | `/reminders/{id}` | Update |
| POST | `/reminders/{id}/snooze` | Snooze |
| POST | `/reminders/{id}/action` | Taken/skipped action |
| POST | `/internal/tick` | Scheduler trigger; secret protected |
| POST | `/telegram/webhook` | Telegram webhook |

`/internal/tick` must not be public without a high-entropy secret and constant-time validation.

## 10. Health and operations
- `GET /healthz`: process liveness, minimal response.
- `GET /readyz`: dependency readiness without exposing secrets.
- `GET /version`: build/revision metadata.
- OpenAPI docs disabled in production unless explicitly protected and approved.

## 11. API implementation checklist
- [ ] Typed Pydantic request and response models.
- [ ] Permission dependency for profile and resource scope.
- [ ] Pagination and maximum limits.
- [ ] Consistent errors and request IDs.
- [ ] Rate limiting on auth, search, AI, upload and share routes.
- [ ] Idempotency for job-triggering and notification actions.
- [ ] Audit sensitive changes.
- [ ] Contract tests compare implementation with this document.

## 12. v3 additions (endpoints missing from v2)
| Method | Path | Purpose |
|---|---|---|
| GET/POST | `/profiles/{profile_id}/symptoms` | Symptom diary |
| PATCH/DELETE | `/symptoms/{id}` | Edit/remove entry |
| GET/POST | `/profiles/{profile_id}/allergies`, `/conditions` | User-entered, with verification state |
| GET/PUT | `/me/notification-preferences` | Channels, discreet mode, quiet hours, escalation delay |
| POST/DELETE | `/me/push-subscriptions` | Register/remove Web Push subscription |
| POST | `/me/telegram/link-code` | One-time code (short expiry, attempt limit) |
| DELETE | `/me/telegram` | Unlink Telegram |
| GET | `/reminders/{id}/attempts` | Delivery attempts and status |
| GET | `/shares/{share_id}/access-log` | Guest access history (owner only) |
| GET/PUT | `/profiles/{profile_id}/emergency-card` | Configure minimal fields |
| POST | `/profiles/{profile_id}/emergency-card/rotate` | New token, old one invalid |
| GET | `/emergency/{opaque_token}` | Public minimal view (rate limited, no-store) |
| POST | `/invitations/{token}/accept` | Accept caregiver invitation |
| GET/POST | `/me/consents` | Consent history / grant / withdraw |
| GET | `/profiles/{profile_id}/audit-log` | Owner view of sensitive actions |
| GET | `/me/export` | Request full data export (async, short-lived download) |
| POST | `/me/delete-request` | Start account/profile deletion workflow |
| GET/POST/DELETE | `/me/mcp-tokens` | Scoped, expiring tokens (shown once) |
| GET | `/me/ai-usage` | Remaining daily quota |
| POST | `/documents/{document_id}/improve-scan` | Opt-in vision rescan, quota-checked |
| GET/POST | `/profiles/{profile_id}/visit-notes` | Doctor visit memory |
| GET | `/profiles/{profile_id}/changes?since=` | Rule-based change detector |
| GET | `/profiles/{profile_id}/conflicts` | Medication/record conflicts |
| POST | `/conflicts/{id}/resolve` | User decision; history preserved |
| GET | `/profiles/{profile_id}/gaps` | Missing-link candidates |
| GET | `/profiles/{profile_id}/completeness` | Record-completeness indicator |

Rules: all v3 endpoints follow section 1 conventions (server-side profile scope, rate limits, audit on sensitive actions). Public routes return `Cache-Control: no-store`. Quota exhaustion returns 429 with `quota_exhausted` and the assistant falls back to retrieval-only mode.

## 7A. Quick Reference AI (v4 addition)

These are proposed endpoints and must be reconciled with the current router/OpenAPI schema before implementation. Existing assistant endpoints remain supported.

| Method | Path | Purpose |
|---|---|---|
| POST | `/quick-reference/query` | General reference query or selected mode query |
| GET | `/quick-reference/suggestions` | Return safe example prompts/modes |
| GET | `/quick-reference/sources` | List available curated source metadata |
| POST | `/profiles/{profile_id}/quick-reference/records` | Query verified records in the authorised profile |

Suggested request:
```json
{
  "mode": "medical_term",
  "question": "What does HbA1c measure?",
  "record_ids": [],
  "include_archived": false,
  "response_style": "concise"
}
```

Suggested response fields: `mode`, `answer`, `sources`, `record_citations`, `limitations`, `generation` (`used`, `provider`, `cached`), `status`, `request_id`. Do not invent source metadata or citations. For record mode, profile authorization is mandatory and `profile_id` must never be trusted from an unvalidated client context. Use `QUICK_REFERENCE_AI.md` for validation, fallback and cache rules.
