# Integrations and External Services

## 1. Integration principles
- Use provider adapters and typed interfaces.
- Secrets live in environment/secret manager, never source control.
- Minimise data sent to providers.
- Timeouts, bounded retries and circuit breakers.
- Record provider status without logging health content.
- Re-check free-tier terms and limits before launch; they change.

## 2. Reference integration matrix
| Capability | Candidate | Notes |
|---|---|---|
| Frontend hosting | Vercel | Static/PWA hosting |
| Backend hosting | Render | Free instance may sleep; cold starts |
| Database | Neon PostgreSQL | TLS; confirm backup/retention and pgvector support |
| File storage | Cloudflare R2 / Supabase Storage | Private bucket and signed URLs |
| OCR | Tesseract | Free, self-hosted; handwriting limitations |
| OCR enhancement | Vision provider | Explicit opt-in and quota cap |
| LLM | OpenAI or another approved provider | Provider abstraction, no medical authority |
| Embeddings | Approved embedding API or local model | Fixed dimensions; reindex on model change |
| Push | Web Push + VAPID | Browser/platform support varies |
| Email | Brevo / Resend | SPF/DKIM, quotas, delivery tracking |
| Chat reminders | Telegram Bot API | Bot chats are not end-to-end encrypted |
| Scheduler | cron-job.org / managed scheduler | Must authenticate and be idempotent |
| PDF | ReportLab / WeasyPrint | Validate fonts and rendering |
| Monitoring | Sentry / uptime monitor | PHI scrubbing mandatory |

## 3. OCR integration
- Run local OCR first where feasible.
- Store OCR text per page and language metadata.
- Preserve page number and bounding boxes when possible.
- Confidence score is a review hint, not truth.
- Low-confidence or handwritten data requires manual confirmation.
- OCR failure must not delete the original upload.

## 4. LLM provider adapter
Interface should expose `generate_structured`, `generate_text` and optional `embed`. Provider adapter owns authentication, timeout, retries and usage reporting. Business services own authorization, prompts, citations and validation.

Never send an entire family profile by default. Send only relevant verified evidence.

## 5. Storage
- Private bucket only.
- Random object keys; original filename stored as metadata.
- Signed URLs short-lived and created after authorization.
- Encryption at rest and TLS in transit.
- Validate content on upload and download.
- Lifecycle policy for temporary exports and abandoned uploads.
- Back up database and object metadata; test restore.

## 6. Web Push
- Generate VAPID keys securely.
- Store subscription endpoint and encrypted keys.
- Remove expired subscriptions on 404/410.
- Require explicit permission.
- Notification content is discreet by default.
- Provide in-app fallback and preference controls.

## 7. Telegram
- User opt-in and one-time linking code with expiry/attempt limit.
- Verify webhook secret header.
- Bind chat ID to authenticated account.
- Validate callback ownership and token expiry.
- No detailed diagnosis, lab values or medicine names in notification by default.
- Explain bot privacy limitations.
- Telegram document intake is unverified until reviewed in app.

## 8. Scheduler
`POST /internal/tick`:
1. Authenticate secret with constant-time comparison.
2. Acquire due jobs with `FOR UPDATE SKIP LOCKED`.
3. Use idempotency key per scheduled occurrence/channel.
4. Send via opted-in channel.
5. Persist attempt and provider response.
6. Retry transient errors with bounded backoff.
7. Mark terminal failures and surface status.
8. Expire shares and cleanup eligible temporary files.
9. Return aggregate counts only.

Free-tier cron is best-effort; do not promise exact minute delivery.

## 9. ABDM / ABHA and wearables
Treat as future interoperability work. Requires sandbox access, consent design, identity matching, standards mapping, security review and current programme documentation. Never scrape portals or store ABHA identifiers without a defined legal and product basis.

## 10. Integrations explicitly excluded from MVP
- Unofficial WhatsApp automation or libraries.
- Unapproved SMS gateway.
- Public file hosting.
- Any connector that transmits records without explicit consent and a documented data-processing review.

## OpenAI-only generative AI policy (v4)

For the current product scope, OpenAI API is the only external generative-AI provider. Do not add Gemini, Claude, Groq or another paid generation provider. The existing provider adapter may retain an offline/mock implementation for development and outage testing, but production generation is OpenAI-only unless a future documented decision changes this policy.

- Keep API key in backend environment secrets only.
- Configure model through environment/configuration; do not hardcode model names in business logic.
- Use strict request timeouts, bounded input/output tokens, minimal retrieved context and one bounded retry at most.
- Enforce per-user daily quotas and a hard global monthly spend cap.
- Do not assume ChatGPT subscription includes API credits; API billing is separate.
- Verify current model availability, pricing, data controls and contractual terms before production release.
- Use PostgreSQL full-text search and curated source metadata as the no-extra-provider baseline. Embeddings can use existing pgvector data or an optional local model; do not make a second hosted embedding API mandatory.
- OpenAI provider outage or budget exhaustion must leave search, verified record retrieval, rules and cached reference snippets available.
