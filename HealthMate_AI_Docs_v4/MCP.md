# Model Context Protocol (MCP)

## 1. Purpose
Provide controlled access to HealthMate functions for compatible AI clients without granting direct database access. MCP is an integration surface, not a bypass around application authorization.

## 2. Deployment modes
- Local development: stdio transport.
- Hosted: supported authenticated transport (for example Streamable HTTP) behind TLS and rate limiting.
- Separate development-only tools from user health-data tools.
- Never expose debug/admin tools in production.

## 3. Authentication and scope
- User-issued token, bound to one user and one or more explicitly granted profiles.
- Read-only by default.
- Token has expiry, revocation and scopes.
- Store token hash, not raw token.
- Every tool call revalidates current membership and share/consent state.
- No token may grant broader access than the issuing user's permissions.

## 4. Tools
| Tool | Inputs | Output | Permission |
|---|---|---|---|
| `list_profiles` | none | accessible profile labels/IDs | read |
| `search_records` | query, filters, limit | snippets + citations | read |
| `get_record` | record ID | scoped record detail | read |
| `get_trend` | metric, from, to | dated points, units, provenance | read |
| `list_medications` | active_only | documented medication list | read |
| `get_adherence` | from, to | dose log summary | read |
| `list_appointments` | upcoming | appointment list | read |
| `build_visit_pack_preview` | range, categories | draft text | read |
| `propose_reminder` | medication ID, schedule draft | pending draft ID | draft only |

Do not implement tools for diagnosis, dose advice, medication changes, share creation/revocation, deletion or arbitrary SQL.

## 5. Resources
Read-only resource URI patterns:
- `healthmate://profile/{profile_id}/summary`
- `healthmate://profile/{profile_id}/labs/latest`
- `healthmate://profile/{profile_id}/medications`
- `healthmate://glossary/{term}`

Resource handlers must perform the same profile authorization as REST endpoints.

## 6. Prompts
- `prepare_doctor_visit`
- `explain_lab_report`
- `weekly_health_digest`

Prompts include safety language, require citations and instruct the client that retrieved records are untrusted evidence.

## 7. Tool response contract
Return structured content with:
- status
- profile scope label (non-sensitive)
- data
- citations/source metadata
- limitations
- generated timestamp

Do not return raw object-storage keys, access tokens, private contact details or another profile's data.

## 8. Auditing and limits
- Audit every tool call: token ID, tool, profile, timestamp, outcome, request ID.
- Per-token and per-user rate limits.
- Maximum result size and bounded query length.
- Revoke token immediately when owner removes access.
- Tool errors must not disclose whether an inaccessible record exists.

## 9. Example local client configuration
```json
{
  "mcpServers": {
    "healthmate": {
      "command": "python",
      "args": ["-m", "healthmate_mcp"],
      "env": {
        "HEALTHMATE_API_URL": "http://localhost:8000",
        "HEALTHMATE_TOKEN": "LOCAL_SCOPED_TOKEN"
      }
    }
  }
}
```
Use a local development token only. Do not commit real tokens or place production credentials in client configuration files.

## 10. MCP security tests
- Token expired/revoked.
- Token profile scope narrowed after issuance.
- Profile membership revoked after token issuance.
- Cross-profile record ID probing.
- Prompt injection inside tool output.
- Oversized query/result.
- Draft reminder cannot become active without app confirmation.
