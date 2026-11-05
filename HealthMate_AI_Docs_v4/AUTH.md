# Authentication, Authorization and Sharing

## 1. Identity model
A user account is not the same as a health profile. One account may own or be authorised to access multiple profiles. Every request is made by a user principal and evaluated against a specific profile permission.

## 2. Authentication requirements
- Hash passwords using Argon2id or bcrypt with maintained parameters.
- Enforce password length and breached-password policy where practical.
- Rate limit login, registration and recovery.
- Use short-lived access tokens and rotating refresh sessions, or secure server-side sessions.
- Prefer HttpOnly, Secure, SameSite cookies for browser refresh/session credentials when architecture permits.
- If bearer tokens are used, keep exposure and XSS risks in view; avoid long-lived tokens in localStorage.
- Revoke refresh sessions on logout, password reset and suspected compromise.
- Never log tokens, password values or recovery codes.

The current project has historically used short-lived JWT access tokens and sessionStorage. Treat that as an implementation fact to audit—not a security endorsement. Add refresh-session revocation and evaluate cookie-based renewal before real-user launch.

## 3. Roles
| Role | Read | Create/edit records | Manage members | Create share |
|---|---:|---:|---:|---:|
| Owner | Yes | Yes | Yes | Yes |
| Caregiver editor | Scoped | Scoped | No | Only if explicitly granted |
| Caregiver viewer | Scoped | No | No | No |
| Clinician guest | Share scope only | No | No | No |
| Support operator | No patient content by default | No | No | No |

Permission granularity should be explicit. Do not infer permissions from relationship labels such as “mother” or “child”.

## 4. Authorization algorithm
For every request:
1. Authenticate principal.
2. Resolve target profile from route/resource.
3. Load active membership/ownership.
4. Check requested action against role and explicit grants.
5. Check resource belongs to target profile.
6. Apply archive and consent rules.
7. Execute scoped repository query.
8. Write audit event for sensitive action.

Never accept a model-generated `user_id`, `profile_id`, role or share scope. A client-provided profile ID is only a requested target; server authorization decides access.

## 5. Profile switching
- Frontend changes active profile only after server confirms access.
- Cancel in-flight queries for the previous profile.
- Clear or namespace cached data by profile ID.
- Reset selected document, chart and assistant context.
- Backend rechecks every request; frontend state is not an authorization boundary.

## 6. Share token design
- Generate at least 256 bits of cryptographically secure randomness.
- Store a keyed hash or secure hash of token; never raw token.
- QR includes only an opaque HTTPS URL.
- Scope contains explicit categories, date range and permitted actions.
- Expiry is mandatory; default should be short and visible.
- Optional PIN is hashed and rate limited.
- Revoke is immediate and checked on every guest request.
- Do not expose search, profile lists, or unrelated record identifiers.
- Prevent caching of sensitive guest pages; use no-store headers.

## 7. Session and account lifecycle
- Logout revokes current refresh session.
- Password change revokes all sessions.
- Account recovery uses single-use, short-lived tokens.
- Membership removal invalidates future requests immediately.
- Deleted/archived profiles are inaccessible according to retention policy.
- Suspicious session events can require re-authentication.

## 8. Audit events
Record actor, profile, action, resource type/id, timestamp, request ID, outcome and minimal metadata. Do not store raw medical text, access tokens or full share URLs in audit payloads.

## 9. Security tests
- User A cannot fetch user B's document by guessed UUID.
- Caregiver cannot access an ungranted category.
- Revoked member loses access immediately.
- Expired/revoked share fails closed.
- PIN brute force is rate limited.
- Profile switching does not display stale previous-profile data.
- Refresh token rotation rejects reuse.

## 10. v3 clarifications
- **Clinician guest is not an account or membership role.** Guests only hold a short-lived share session created from a valid share token (plus PIN). Do not add `clinician_guest` to `profile_memberships.role`.
- **Session strategy recommendation (see ADR-007):** access token in memory, rotating refresh token in an HttpOnly Secure cookie with reuse detection. Vercel and Render are different sites, so cross-site cookies may be blocked (notably Safari). Fix by serving frontend and API under one parent domain (for example `app.` and `api.`), or by proxying `/api` through the frontend host so cookies stay first-party. Test on iPhone Safari before choosing.
- **Cron and webhooks:** `/internal/tick` requires a long random secret (constant-time compare); Telegram webhook verifies the secret-token header; Telegram button callbacks and Web Push action links carry single-use, short-lived signed tokens bound to one dose.
- **MCP tokens and emergency tokens:** random, hashed at rest, shown once, revocable, rotated on demand.
