# Testing Strategy

## 1. Quality model
Use a test pyramid: many fast unit tests, focused integration tests, contract tests, a small number of end-to-end flows, plus dedicated security and AI evaluations.

| Level | Tools | Main concern |
|---|---|---|
| Unit | pytest, Vitest | Domain logic, validation, formatting |
| Integration | pytest + test PostgreSQL | Repositories, routers, transactions |
| Contract | OpenAPI schema checks | API/documentation compatibility |
| E2E | Playwright | Critical user journeys |
| AI eval | Golden datasets | Grounding, refusals, prompt injection |
| Security | pytest + manual review | Authz, upload, token and share safety |
| Performance | Locust/k6 | Search, share and scheduler load |

## 2. Backend test suites
- Auth registration, login, logout, refresh rotation, password recovery.
- Profile owner/member/viewer permission matrix.
- Cross-profile access for every resource type.
- Document upload MIME, size, page count, corrupt file and duplicate.
- OCR failure and retry state.
- Extraction schema invalidity and verification transaction.
- Lab unit handling and trend calculations.
- Archive filtering and include-archived permissions.
- Export profile scoping.
- Reminder idempotency, concurrent tick and channel failures.
- Share token expiry, revoke, PIN lockout and scope.
- Audit event completeness and PHI redaction.

## 3. Frontend test suites
- Form validation and accessible errors.
- Loading/empty/error/permission states.
- Profile switch cache invalidation.
- Document review and correction.
- Chart/table consistency.
- Assistant citations open correct source.
- Responsive layout at 360px, 768px and 1440px.
- Keyboard-only critical flows.

## 4. AI evaluation
Maintain versioned examples with expected behaviour, not only expected wording:
- Correct answer from one source.
- Conflicting records and date ordering.
- No matching record.
- Unverified data exclusion.
- Citation fabrication.
- Prompt injection in PDF/OCR.
- Cross-profile request.
- Diagnosis, prescribing and dose-change request.
- Emergency language.
- Provider outage and quota exhaustion.
- Language/translation quality.

Measure citation precision, unsupported-claim rate, refusal correctness, retrieval relevance and latency.

## 5. Required isolation matrix
Test owner, caregiver-editor, caregiver-viewer, clinician guest and unrelated user against:
- Documents and content URLs.
- Labs and vitals.
- Medications and dose logs.
- Appointments and symptoms.
- Assistant and search.
- Insights and comparisons.
- PDF/CSV exports.
- Calendar and care overview.
- Shares and audit logs.
- MCP resources and tools.

No endpoint is exempt because the UI hides it.

## 6. Commands
Use commands that exist in current package files. Common examples:
```powershell
# Backend
pytest -q

# Frontend
npm run test
npm run lint
npm run typecheck

# Browser tests
npx playwright test
```

## 7. Manual release checklist
- [ ] Fresh install from documented steps.
- [ ] Migrations from empty DB and previous release.
- [ ] Synthetic seed works and is repeatable.
- [ ] Every screen has loading/empty/error states.
- [ ] Profile switch has no stale data.
- [ ] No PHI in application logs.
- [ ] Upload validation and private file access verified.
- [ ] QR scan, expiry and revoke tested on phone.
- [ ] Notification opt-out and provider failure tested.
- [ ] Keyboard navigation and zoom reviewed.
- [ ] Backup restore drill completed.
- [ ] AI red-team suite passes.
- [ ] Deployment rollback procedure known.

Record actual command, commit SHA, environment and result. Never claim historical pass counts as a current test run.

## 8. v3 additions
- **Scheduler:** call `/internal/tick` twice -> one send; concurrent ticks use `SKIP LOCKED`; wrong/missing secret -> 401; late tick still sends once; overdue doses marked missed; escalation only with consent.
- **Channels:** Web Push 404/410 removes subscription; Telegram wrong chat_id rejected; link code expiry and attempt limit; email failure falls back to next opted-in channel; default text contains no medicine names or values.
- **AI quota:** per-user and global caps, cache hit avoids a call, vision only after opt-in, retrieval-only mode when exhausted.
- **Intelligence services:** conflict detector (5 mg vs 10 mg across sources), unit-incomparable values not compared, change detector uses verified data only, gap finder wording is neutral, nothing is auto-resolved.
- **Privacy centre:** export contains only the user's profiles; delete request removes objects and embeddings; access log matches guest views.
- **Cookies:** refresh flow works on iOS Safari with the chosen domain setup.
- **Cold start:** simulate 30-60 s first request and cron retry.
