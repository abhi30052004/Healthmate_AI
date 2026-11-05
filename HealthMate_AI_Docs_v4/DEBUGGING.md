# Debugging and Troubleshooting Runbook

## 1. First-response checklist
1. Capture timestamp, environment and request/correlation ID.
2. Identify affected user flow and active profile (use synthetic account).
3. Check backend logs with PHI-safe filtering.
4. Check service health, database readiness and migration head.
5. Reproduce with synthetic data.
6. Isolate frontend, API, DB, storage, AI provider or background job.
7. Apply the smallest fix and add a regression test.
8. Verify adjacent profile/security flows.

Never paste real patient data, tokens or signed URLs into issue trackers.

## 2. Backend does not start
- Confirm correct virtual environment and Python version.
- Install requirements from the correct folder.
- Check import path and ASGI command.
- Validate required environment variable names against settings code.
- Check port conflict:
```powershell
Get-NetTCPConnection -LocalPort 8000 -State Listen
```
- Inspect traceback; do not suppress startup errors.

## 3. Database connection failure
- Verify Neon host/database/user and URL encoding of special password characters.
- Require TLS as configured by provider.
- Check network access and connection limits.
- Confirm SQLAlchemy driver matches URL scheme.
- Test `SELECT 1`.
- Do not print full DATABASE_URL in logs or screenshots.

## 4. Migration mismatch
```powershell
alembic current
alembic heads
alembic history --verbose
```
- Inspect migration graph and applied revision table.
- Back up before production migration.
- Never delete migration files or stamp a revision without verifying schema equivalence.

## 5. Upload/OCR issues
- Check file signature, MIME, byte size and page count.
- Confirm object storage credentials and private bucket policy.
- Inspect document status and job error code.
- Check Tesseract executable/path and supported language packs.
- Confirm OCR worker can read object through server-side credentials.
- Keep original file when OCR fails; provide retry/manual entry.

## 6. Extraction fields missing or wrong
- Inspect OCR text and page number in a synthetic test.
- Validate schema and extraction prompt version.
- Check date formats, decimal separators and unit parser.
- Ensure low-confidence values remain unverified.
- Add a regression fixture; never patch a single record silently.

## 7. Trend chart empty or misleading
- Confirm record is verified and not archived by default.
- Check profile scope, metric canonical name and date filters.
- Check unit compatibility and numeric parsing.
- Inspect API response before debugging chart component.
- Ensure chart has table alternative and source links.

## 8. AI answer has no citation / wrong profile
- Inspect retrieval IDs and server-derived profile scope.
- Confirm citation validator checks source membership.
- Confirm profile switch clears query cache and conversation context.
- Disable AI if cross-profile leakage is suspected.
- Preserve redacted request ID for investigation.

## 9. Frontend API/network issue
- Verify API base URL and CORS allowlist.
- Inspect browser Network tab status and response code.
- Check auth expiry and refresh flow.
- Confirm proxy configuration in Vite.
- Avoid logging authorization headers.

## 10. Render/Vercel deployment issues
- Confirm build command, root directory and start command.
- Confirm required environment variables are present.
- Check frontend points to deployed API URL.
- Check backend CORS includes exact frontend origin.
- Check migrations were applied.
- Free service cold starts can delay first request; do not mistake this for a guaranteed app failure.
- Video/image or large file workloads may exceed free-tier CPU/memory/time limits.

## 11. Reminder not delivered
- Check schedule timezone and `fire_at`.
- Check cron authentication and invocation timestamp.
- Check job lock/idempotency key and notification attempt state.
- Check provider response, subscription expiry and user preferences.
- Confirm quiet hours and opt-out.
- Do not send a duplicate manually until delivery state is understood.

## 12. Incident response
If data exposure, cross-profile access or token compromise is suspected:
1. Disable affected feature/integration or revoke relevant tokens.
2. Preserve security logs without copying PHI.
3. Identify scope and time window.
4. Rotate secrets and invalidate sessions as appropriate.
5. Notify responsible project/security owner.
6. Follow applicable legal notification obligations after qualified review.
7. Add regression tests and document corrective actions.

## 13. v3 additions
| Symptom | Likely cause | Fix |
|---|---|---|
| Reminders late or missing | Cron paused, wrong secret, host asleep | Check cron history and `tick_runs`; call tick manually; confirm secret |
| Tick returns 401 | Header or secret mismatch | Match `X-Cron-Secret` exactly |
| Duplicate reminders | Overlapping ticks | Check `dedupe_key` and row locking |
| Push never arrives | iOS not installed as PWA, permission denied, stale subscription | Add to Home Screen, re-subscribe, check 410 cleanup |
| Telegram buttons do nothing | Webhook not set or wrong secret | `getWebhookInfo`, reset webhook, verify header |
| Login works then logs out on iPhone | Cross-site refresh cookie blocked | Use one parent domain or a same-origin proxy |
| "Quota exhausted" too early | Retries or long inputs | Inspect `ai_usage`, trim context, cap retries |
| Email not sent | Free cap or unverified domain | Check provider dashboard, SPF/DKIM |
