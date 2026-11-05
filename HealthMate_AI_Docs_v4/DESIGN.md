# UX and Visual Design Specification

## 1. Design direction
Premium, calm healthcare SaaS. The interface should feel trustworthy, clear and efficient—not like a hospital admin system or a generic AI chat clone.

**Visual language**
- Base: warm off-white / very light cool grey surfaces.
- Primary: deep teal or medical blue for navigation and primary actions.
- Accent: restrained green for verified/success states.
- Warning: amber for review-needed states; red only for genuine errors or urgent system warnings.
- Typography: highly readable sans-serif, clear numeric alignment for measurements.
- Cards: subtle borders, restrained shadows, consistent radius; avoid oversized empty cards and excessive gradients.
- Motion: short, purposeful transitions; respect reduced-motion preferences.

## 2. Navigation model
Desktop sidebar:
1. Overview
2. Health Records
3. Timeline & Trends
4. Medications
5. Appointments
6. Doctor Visit Pack
7. AI Health Assistant
8. Family Profiles
9. Sharing & Emergency Card
10. Settings

Top bar:
- Active profile selector with relationship label.
- Global search.
- Notifications.
- Help and account menu.

Mobile:
- Compact top bar with profile selector.
- Bottom navigation for Overview, Records, Assistant and More.
- Deep sections use a back navigation pattern; do not compress desktop sidebar into tiny icons only.

## 3. Information architecture
### Overview
- Welcome and active profile context.
- “Recently added” records.
- Upcoming appointments and reminder status.
- Latest verified measurements (date + unit).
- Tasks requiring review.
- Quick actions: upload, log a vital, prepare visit pack.
- No diagnosis or unvalidated risk score.

### Health Records
- Search and filter by document type/date/status.
- List/table with source, date, processing status and actions.
- Document detail uses split view: source preview and extracted fields.
- Review state is explicit: Needs review / Verified / Rejected / Failed.

### Timeline & Trends
- Metric selector, date range, chart, table view and source list.
- Reference range band only when source range is available and valid.
- Unit mismatch banner and no misleading continuous line across incomparable units.
- Clicking a point opens its source record.

### AI Assistant
- Suggested safe prompts.
- Answer with citation chips [S1], [S2].
- Evidence drawer shows document name, date, page and extracted text.
- Clear notice: explains records; not diagnosis or medical advice.
- “Report an issue” action.

### Family
- Profile cards with access role and last activity.
- Invite flow, permissions summary and revoke action.
- Active profile is always visible.

## 4. Design tokens
Use CSS variables / Tailwind theme tokens rather than scattered literal values.

| Token | Suggested value | Use |
|---|---|---|
| `--color-primary-700` | `#075B63` | Primary actions |
| `--color-primary-600` | `#087A83` | Active navigation |
| `--color-accent-500` | `#2E9B79` | Verified/success |
| `--color-text` | `#172B32` | Main text |
| `--color-muted` | `#647780` | Secondary text |
| `--color-bg` | `#F5F8F8` | App background |
| `--color-surface` | `#FFFFFF` | Cards |
| `--color-border` | `#DCE6E7` | Dividers |
| `--color-warning` | `#A96513` | Needs review |
| `--color-danger` | `#B42332` | Errors/destructive |

Values are a starting palette; validate contrast for each foreground/background pairing.

## 5. Components
- AppShell, Sidebar, MobileNav, Topbar, ProfileSwitcher.
- MetricCard, TrendChart, DataTable, EmptyState, ErrorState, Skeleton.
- StatusBadge, SourceCitation, VerificationBanner.
- DocumentUploader, DocumentPreview, ExtractionReviewPanel.
- MedicationCard, AppointmentCard, ReminderPreferencePanel.
- VisitPackBuilder, ShareScopeDialog, QRDisplay, AccessLog.
- AssistantComposer, AnswerCard, CitationDrawer, SafetyNotice.
- ConfirmDialog, Toast, FormField, DateRangePicker.

Each component must have typed props, accessible names, focus behavior and documented loading/error states.

## 6. Interaction rules
- Confirm before delete, revoke, merge or irreversible actions.
- Show save state and preserve user input after recoverable errors.
- Do not use colour alone to communicate verification or urgency.
- Avoid auto-refresh that changes the selected profile or loses unsaved edits.
- Profile switching invalidates all profile-scoped client caches.
- Use optimistic updates only for reversible, low-risk UI state; not for medical record verification or sharing permissions.

## 7. Responsive breakpoints
Suggested Tailwind breakpoints:
- Small: <640px
- Medium: 640–1023px
- Large: 1024–1279px
- Wide: >=1280px

Tables become stacked cards on small screens. Charts retain readable labels and offer an accessible tabular alternative.

## 8. Accessibility
Target WCAG 2.2 AA as an engineering goal:
- Keyboard access for all actions.
- Visible focus and logical focus order.
- Minimum contrast checks.
- Labels and error descriptions for every form field.
- Screen-reader announcements for async processing.
- Reduced-motion support.
- Do not encode chart meaning by colour alone.

## 9. Content style
Use plain, non-alarming language:
- “Above the reference range shown on this report” rather than “dangerous”.
- “No matching result found in this profile” rather than guessing.
- “Needs your review” rather than “AI failed”.
- “Reminder delivery may be delayed” when using best-effort infrastructure.

## 10. Design QA
Review desktop 1440px, tablet 768px and mobile 360/390px. Test long names, missing data, large reports, slow networks, expired sessions, permission denial and empty profiles.

## 11. v3 additions
- **Notification settings:** toggles for Web Push, Telegram and email; discreet mode (default on); quiet hours; escalation delay; visible note that reminders may arrive a few minutes late; per-reminder delivery status.
- **Connect Telegram:** shows one-time code and bot name; states that Telegram bot chats are not end-to-end encrypted.
- **PWA install guide:** short iPhone "Add to Home Screen" steps (needed for push).
- **Symptom diary:** one-field quick add with severity chips; appears in Visit Pack preview.
- **Allergies and conditions:** simple lists with "verified / needs review" and last-updated date.
- **Privacy centre:** active shares, access log, linked channels, export and delete request.
- **Conflict review:** side-by-side sources with dates and verification status; buttons "I confirmed with my clinician", "Keep both", "Dismiss"; never auto-resolve.
- **Changes and gaps:** "What changed since last report" and "Possibly missing" cards with neutral wording.
- **Simple mode:** three large buttons (Medicines, Records, Doctor), 20px+ text.
- **Language switcher:** English, Bengali, Hindi.
- **AI quota indicator** and "Improve scan (uses AI quota)" button; friendly retrieval-only message when quota is exhausted.
- Navigation: add **Symptoms** under Health Records and **Privacy** under Settings.
