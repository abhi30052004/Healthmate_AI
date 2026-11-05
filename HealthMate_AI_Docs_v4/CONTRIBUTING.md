# Contribution and Engineering Standards

## 1. Workflow
1. Create a focused branch.
2. Read relevant product, architecture and guardrail docs.
3. Confirm scope and acceptance criteria.
4. Implement backend/domain logic before wiring UI where appropriate.
5. Add migrations and tests.
6. Update API and feature docs.
7. Run focused checks.
8. Review security, privacy and accessibility impact.
9. Open a PR with screenshots/test evidence where useful.

## 2. Coding standards
- Python: type hints, Pydantic schemas, clear service boundaries, no broad silent exception handling.
- TypeScript: strict mode, typed API responses, reusable feature components.
- SQL: explicit profile scoping, bounded queries and reviewed migrations.
- API: stable error codes and pagination.
- UI: accessible labels, keyboard navigation and responsive states.
- AI: versioned prompts, structured outputs and evaluation fixtures.

## 3. Required PR checklist
- [ ] Acceptance criteria met.
- [ ] Profile scope derived and enforced server-side.
- [ ] No PHI or secrets in logs.
- [ ] Migration reviewed and tested.
- [ ] Unit/integration tests added.
- [ ] API documentation updated.
- [ ] Loading/empty/error/denied UI states covered.
- [ ] Accessibility reviewed.
- [ ] AI changes pass red-team/evaluation set.
- [ ] Feature flags and rollback considered.

## 4. Git hygiene
- Never commit `.env`, credentials, private keys, health documents or real user exports.
- Use synthetic fixtures.
- Keep commits focused and descriptive.
- Do not rewrite shared history without agreement.
- Scan repository for secrets before push.

## 5. Definition of done
Code compiles, tests pass, authorization is verified, observability exists, docs are updated, UX states are complete and the feature has a rollback/disable strategy.
