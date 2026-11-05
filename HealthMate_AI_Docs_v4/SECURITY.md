# Security, Privacy and Threat Model

## 1. Assets
- Account credentials and session tokens.
- Health profiles and relationships.
- Original documents, OCR text and extracted facts.
- Medication and appointment information.
- Share tokens, PINs and access logs.
- AI prompts, retrieved chunks and provider credentials.
- Backups, exports and temporary files.

## 2. Threat actors and risks
- Unauthenticated internet attacker.
- Authenticated user attempting cross-profile access.
- Malicious or compromised caregiver.
- Stolen device/session.
- Malicious PDF or prompt-injection content.
- Compromised third-party provider or webhook.
- Insider misuse or accidental log exposure.
- Misconfigured public object storage.
- Denial of service / quota abuse.

## 3. Security controls
### Identity
Strong password hashing, session rotation/revocation, rate limiting, recovery controls and optional MFA roadmap.

### Authorization
Server-side permission checks on every request; profile ownership and membership; object-level checks; no trust in frontend role state.

### Data protection
TLS, private storage, encryption at rest where supported, secret manager, minimum data collection, redacted logs and short-lived signed URLs.

### Upload security
MIME signature validation, file size/page limits, safe parsing, malware scanning where available, isolated processing and no public execution of uploaded content.

### AI security
Untrusted evidence delimiters, no arbitrary SQL, allowlisted tools, schema validation, citation validation, no model-controlled authorization and prompt-injection tests.

### Sharing
High-entropy opaque tokens, hashed at rest, short expiry, optional PIN, rate limits, no-store headers, access audit and immediate revoke.

### Operations
Dependency scanning, secret scanning, least-privilege service credentials, backups, restore drills, security headers and incident plan.

## 4. Privacy principles
- Collect only information needed for a defined feature.
- Explain why sensitive fields are requested.
- Obtain specific consent for sharing and caregiver access.
- Allow users to review and correct extracted information.
- Define retention, export and deletion behaviour.
- Do not use patient records for model training by design; verify current provider terms and account settings.
- Use synthetic data until the real-user launch gate is approved.

## 5. Logging policy
Allowed: request ID, route template, status, latency, service name, error code, actor ID pseudonym where needed, profile ID only if access-controlled.
Prohibited: passwords, tokens, raw share URLs, full OCR, full medical prompts, full report content, unnecessary names/contact details.

## 6. Retention and deletion
Create a documented retention schedule for originals, OCR text, embeddings, exports, logs and backups. Deletion must cover primary DB, object storage and derived search data according to policy; backup expiry may be delayed and must be disclosed. Legal retention requirements require qualified review.

## 7. Incident response
Maintain severity levels, owner, containment steps, evidence handling, communications plan and recovery procedure. Test the process at least annually or before public launch.

## 8. Launch blockers
- Any cross-profile data exposure.
- Public health-document bucket.
- Unhashed share tokens.
- Secrets in repository or logs.
- AI can change medication or share permissions.
- Unvalidated citation claims.
- No tested backup restore.
- No consent and deletion workflow.
- Real patient data used before review.

## 9. v3 additions
- **India/regulatory review:** before any real-user pilot, have qualified counsel review obligations under the Digital Personal Data Protection Act, 2023 and its rules, and any healthcare-specific or ABDM consent requirements that apply. Confirm current text; this handbook is not legal advice.
- **Cron and webhook secrets:** rotate on any suspected leak; never log them; responses from `/internal/tick` return counts only.
- **Telegram:** bot chats are not end-to-end encrypted; keep default notification text discreet and never send documents or values.
- **Free-tier logs:** host logs are short-lived; keep audit events in the database.
- **Third-party AI:** send minimum necessary evidence to OpenAI; confirm current data-retention and training settings before real records.
- **Emergency card and MCP tokens:** separate random tokens, hashed at rest, revocable, rotatable.
- **Add launch blockers:** unauthenticated `/internal/tick`, unverified Telegram webhook, notification text containing medicine names or values by default.
