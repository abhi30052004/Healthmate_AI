# Deployment and Release Runbook

## 1. Environments
- Local: synthetic data, debug logging, local storage.
- Preview/staging: isolated database and storage, synthetic seed only.
- Production: strong secrets, private storage, restricted docs, monitoring and backups.

Never point preview deployments at production health data.

## 2. Backend deployment (Render reference)
- Root directory: `backend` if repository layout supports it.
- Build: install pinned dependencies.
- Start: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`.
- Apply Alembic migrations as a controlled release step.
- Set production environment variables in the host dashboard.
- Configure exact CORS origins.
- Add health/readiness checks.
- Keep secrets out of build logs.

Free-tier services may sleep and have limited CPU/RAM. They are not appropriate for guaranteed-time reminders or heavy OCR/vision workloads.

## 3. Frontend deployment (Vercel reference)
- Root directory: `frontend`.
- Build: repository's production build script.
- Set API base URL to deployed backend.
- Configure SPA routing fallback if required.
- Restrict preview domains and production origins appropriately.
- Check browser console and network requests after deploy.

## 4. Production configuration checklist
- `APP_ENV=production` or exact equivalent.
- Strong random JWT/session secret.
- HTTPS only.
- CORS allowlist, no wildcard with credentials.
- API docs disabled or protected.
- AI enabled only after guardrails/quota are verified.
- Private object storage.
- Database TLS.
- Cron secret and webhook secret rotated.
- Error monitoring with PHI scrubbing.
- Backup and restore procedure tested.

## 5. Release sequence
1. Freeze release commit and review changelog.
2. Run focused tests and full required CI.
3. Back up database.
4. Apply backward-compatible migration.
5. Deploy backend.
6. Verify readiness and migration head.
7. Deploy frontend.
8. Run synthetic smoke tests.
9. Verify upload, profile isolation, assistant citations and share revoke.
10. Monitor errors, latency and quota.
11. Roll back app version if needed; handle schema rollback only through approved migration strategy.

## 6. Rollback
- Keep previous deploy artifact available.
- Prefer forward-fix for irreversible schema changes.
- Do not roll back a migration blindly if new writes use the new schema.
- Disable risky feature flags first.
- Preserve incident logs and request IDs.

## 7. Operational monitoring
Track uptime, API latency, DB connections, failed jobs, OCR duration, AI usage/cost, citation validation failures, notification attempts and share abuse. Metrics must not contain PHI.

## 8. v3 additions: free-first runtime services
1. **Cron:** create a job in cron-job.org (or a GitHub Actions schedule, minimum 5 minutes and may lag) that POSTs `https://<api>/internal/tick` with header `X-Cron-Secret`. Use 1-minute interval where available; it also keeps a sleeping free service awake. Alert on repeated failures.
2. **Telegram webhook:** after deploy call `setWebhook` with `url=https://<api>/telegram/webhook` and `secret_token`; verify with `getWebhookInfo`.
3. **Web Push:** set VAPID keys; verify the service worker is served over HTTPS; document the iOS Home Screen requirement.
4. **Email:** verify sender domain (SPF/DKIM); watch daily caps.
5. **Storage:** private R2 or Supabase bucket, lifecycle rule for temporary exports.
6. **Same-site cookies:** use one parent domain or a proxy so refresh cookies are first-party (see AUTH.md section 10).
7. **Free-tier limits:** re-check Neon, Render, storage and email limits before launch; record the date checked.
8. **Smoke test after deploy:** call `/internal/tick` manually, receive one test reminder per channel, revoke a test share.
