# Intelligence Engine (Rule-Based First)

Purpose: help users see what changed, what conflicts and what is missing across their own verified records, without diagnosing. Deterministic services do the detection; the LLM only extracts text and may phrase the result. Every output links to sources and uses neutral wording.

## 1. Principles
- Operate on **verified** data only (unverified shown separately).
- Show sources, dates and units; never convert incomparable units silently.
- Never state or imply diagnosis, urgency or that care was missed.
- Never auto-resolve a conflict; the user decides and the decision is audited.
- Cheap by default: SQL and Python rules, no model call required.

## 2. Components
| Engine | Input | Output |
|---|---|---|
| Change detector | Verified labs/vitals for a canonical test | "Changed since last report" cards: previous value, current value, difference, dates, direction (increased/decreased/unchanged), consistency note ("3 readings in a row") |
| Conflict resolver | Medications and allergies from different sources | Conflict list (for example different strength or instructions), each with sources, dates and verification status |
| Missing-link finder | Follow-up items extracted from documents (user-confirmed) + later records | "No matching record found for follow-up X. Check whether it was done." |
| Completeness indicator | Profile fields and records | Checklist: recent labs present, medication list verified, allergies confirmed, emergency contacts set. Not a health score |
| Visit memory | Visit notes + appointments | "Last visit vs today": open questions, advised tests, follow-up date, changes since |
| Record links | `record_links` table | Simple relations (report -> visit -> medication -> follow-up test) with source references |

## 3. Rules (examples)
- **Change:** same canonical test and compatible unit; compare latest two verified values; flag "consistent direction" after N >= 3 points; skip when units are not comparable.
- **Conflict:** same ingredient or name with different strength/frequency in sources within a time window, or newer source differs from active list; status `open` until user acts.
- **Gap:** follow-up item with `due_hint` passed and no later document/lab matching test name; confidence shown; user can dismiss or mark done.
- **Completeness:** fixed checklist with weights shown to the user; always labelled "record completeness".

## 4. AI use (optional, quota-capped)
- Extract follow-up phrases from discharge text into `followup_items` as drafts for user confirmation.
- Rewrite a card in plainer language. Output must keep numbers, units, dates and citations unchanged and pass the validators in AGENT_GUARDRAILS.md.

## 5. Data model and API
Tables: `record_links`, `medication_conflicts`, `followup_items`, `visit_notes` (see DATABASE.md section 9). Endpoints: `/changes`, `/conflicts`, `/conflicts/{id}/resolve`, `/gaps`, `/completeness`, `/visit-notes` (see API.md section 12).

## 6. Safety and UX wording
Allowed: "increased from 6.2 to 6.8 between 12 Jan and 12 Jul", "no matching record found". Disallowed: "worsening", "dangerous", "you missed your test", "you have". Always include the footer: "This summarises your records. Discuss decisions with your doctor."

## 7. Tests
Conflict detection (5 mg vs 10 mg), unit mismatch skipped, unverified excluded, neutral wording, dismissal persists, audit entry on resolve, cross-profile isolation, no model call needed for detection.

## 8. Roadmap fit
Phase 10 in PLAN.md. Start with change detector and conflict resolver (highest trust value), then visit memory, then gap finder.
