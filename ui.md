# HealthMate AI — UI Rebuild Specification (UI_README)

**Scope:** rebuild the entire frontend from scratch: landing page, login/register, app shell, dashboard and every in-app screen. Keep the **green + white** identity, add modern React components, motion and a page loader. Backend, API contracts and safety rules stay as documented in `API.md`, `AUTH.md`, `AGENT_GUARDRAILS.md`.

> Product rule for all UI copy: HealthMate explains records and supports doctor conversations. It never diagnoses or prescribes. Demo screens use **synthetic data** only.

---

## 1. Goals
1. Feel calm, trustworthy and modern (premium healthcare SaaS, not a hospital admin tool).
2. Answer "what do I need to do today?" within 3 seconds on the dashboard.
3. Work for elders and caregivers: big targets, plain words, Simple mode, regional languages.
4. Motion that guides attention, never delays work. Everything usable with reduced motion.
5. Fast on free hosting: small bundle, lazy routes, transform/opacity animations only.

## 2. Rebuild plan: remove the old UI

### Delete (after the new shell runs)
- All old pages, layouts, dashboard widgets, old CSS/theme files, unused icons/images, old chart wrappers.
- Old route table and navigation config.

### Keep (do not rewrite)
- Typed API client and request helpers (`services/`), auth/token logic, API types and Zod schemas, i18n JSON (if any), test fixtures and synthetic seed data.

### Steps
1. Create branch `ui-rebuild`; tag the old UI (`git tag ui-v1-final`) so you can compare.
2. Move old UI to `frontend/_legacy/` (excluded from build and lint).
3. Scaffold the new structure (section 4) and design tokens (section 5).
4. Build in this order: tokens -> primitives -> app shell -> loader -> auth pages -> dashboard -> records -> trends -> medicines -> rest -> landing.
5. When each screen reaches parity and passes its checklist (section 17), delete the legacy equivalent.
6. Remove `_legacy/` before merge.

## 3. Tech stack (all free)
| Need | Choice |
|---|---|
| Framework | React 18 + TypeScript + Vite |
| Styling | Tailwind CSS with CSS-variable tokens |
| Primitives | Radix UI (accessible dialogs, menus, tabs, tooltips) wrapped in own components (shadcn-style) |
| Motion | `motion` (Framer Motion API, import from `motion/react`) with `MotionConfig reducedMotion="user"` |
| Icons | `lucide-react` |
| Charts | Recharts (with table alternative) |
| Server state | TanStack Query |
| Routing | React Router (lazy routes) |
| Forms | react-hook-form + zod |
| Toasts | sonner |
| QR | `qrcode.react` |
| i18n | react-i18next (EN, BN, HI) |
| PWA | vite-plugin-pwa (offline shell, install prompt) |
| Fonts | Inter (variable) + Plus Jakarta Sans for headings, self-hosted or Google Fonts with system fallback |
| Tests | Vitest, Testing Library, Playwright, axe |

## 4. Project structure
```text
frontend/src/
  app/            router.tsx, providers.tsx (Query, Motion, i18n, Theme), guards
  styles/         tokens.css, globals.css, motion.css
  components/
    ui/           Button, Input, Card, Badge, Tabs, Dialog, Drawer, Tooltip, Skeleton, Toast...
    layout/       AppShell, Sidebar, Topbar, MobileNav, PageHeader, Section
    feedback/     PageLoader, RouteProgress, EmptyState, ErrorState, OfflineBanner
    health/       StatCard, TrendChart, DoseCard, CitationChip, StatusPill, QRDisplay...
    motion/       FadeIn, Stagger, Reveal, AnimatedNumber, PageTransition, variants.ts
  features/
    landing/  auth/  dashboard/  records/  trends/  medicines/  appointments/
    visit-pack/  sharing/  assistant/  family/  symptoms/  privacy/  settings/
  services/       api client (kept)
  hooks/          useProfile, useReducedMotion, useMediaQuery
  i18n/           en.json, bn.json, hi.json
```

## 5. Design tokens (green + white)

Same family as the current palette: deep teal/green primary, soft emerald accent, white surfaces.

```css
:root {
  /* Brand */
  --green-900: #053F44;
  --green-800: #075B63;   /* primary (current) */
  --green-700: #087A83;   /* active nav, links */
  --green-600: #2E9B79;   /* accent / verified */
  --green-500: #43B58F;
  --green-100: #DDF3EA;   /* tints, chips */
  --green-50:  #EEF8F4;   /* section tint */

  /* Neutrals */
  --bg:        #F5F8F8;
  --surface:   #FFFFFF;
  --border:    #DCE6E7;
  --text:      #172B32;
  --muted:     #647780;

  /* Status */
  --warning:   #A96513;  --warning-bg: #FFF3E0;
  --danger:    #B42332;  --danger-bg:  #FDECEE;
  --info:      #2563EB;  --info-bg:    #E8F0FE;

  /* Shape and depth */
  --radius-sm: 8px; --radius: 12px; --radius-lg: 20px; --radius-xl: 28px;
  --shadow-1: 0 1px 2px rgba(7,91,99,.06), 0 1px 1px rgba(7,91,99,.04);
  --shadow-2: 0 8px 24px rgba(7,91,99,.10);
  --focus:    0 0 0 3px rgba(46,155,121,.35);
}
```
Rules:
- Primary buttons: `--green-800` background, white text; hover `--green-900`; verified/success uses `--green-600`.
- Large hero/brand areas may use a soft gradient `--green-50 -> #fff` and a subtle green mesh; avoid heavy gradients elsewhere.
- Red only for errors/urgent system states. Amber for "needs review".
- Never rely on colour alone (add icon + text). Validate every pair for WCAG AA contrast.
- Optional dark mode later by overriding the same variables.

### Typography
| Role | Font | Size / weight |
|---|---|---|
| Display (landing hero) | Plus Jakarta Sans | 48-64 / 700 |
| H1-H3 | Plus Jakarta Sans | 32 / 24 / 20, 650 |
| Body | Inter | 16 (min 14 for dense tables) |
| Numbers (vitals) | Inter with tabular figures | `font-variant-numeric: tabular-nums` |

Spacing scale 4px base (4, 8, 12, 16, 24, 32, 48, 64, 96). Tap targets >= 44px. Body text >= 16px in Simple mode 20px.

## 6. Layout system
- Breakpoints: `sm 640`, `md 768`, `lg 1024`, `xl 1280`, `2xl 1536`.
- App content max width 1280px; reading width (forms, assistant) 720px.
- 12-column grid desktop, 4-column mobile, gap 24 / 16.
- Page structure: `PageHeader` (title, subtitle, actions) -> content sections in cards -> sticky action bar on mobile where needed.

### App shell
```text
Desktop >=1024px                          Mobile <1024px
+--------+-----------------------------+  +-----------------------------+
| Logo   |  Topbar: profile switcher,  |  | Topbar: profile switcher,   |
| Nav    |  search, notifications, me  |  | bell, menu                  |
| (240)  +-----------------------------+  +-----------------------------+
|        |  PageHeader                 |  | PageHeader                  |
| Overview|  Content grid              |  | Content (single column)     |
| Records |                            |  |                             |
| ...     |                            |  +-----------------------------+
| Settings|                            |  | Bottom nav: Home Records    |
+--------+-----------------------------+  |  Medicines Assistant More   |
                                          +-----------------------------+
```
- Sidebar: collapsible to icon rail (labels in tooltips), active item has green pill + left indicator animating with `layoutId`.
- Active profile is always visible in the Topbar; switching profile clears profile-scoped caches and shows a short fade/blur transition.
- Bottom nav: 5 items, safe-area padding, haptic-free.

### Navigation items
Overview, Health Records, Timeline & Trends, Medicines, Appointments, Symptoms, Doctor Visit Pack, AI Assistant, Family, Sharing & Emergency Card, Privacy, Settings. (Simple mode shows only: Medicines, Records, Doctor.)

## 7. Motion system

### Principles
- Purposeful: entrance, feedback, continuity. No looping decoration inside work screens.
- Fast: 150-250 ms for UI, up to 600 ms for hero/landing reveals.
- Only animate `transform` and `opacity` (plus `clip-path`/`stroke-dashoffset` for illustrations).
- Respect `prefers-reduced-motion`: replace movement with instant or simple fade.
- Never animate medical values in a way that hides the real number (counters show final value for screen readers via `aria-label`).
- No animation on verification, share creation or permission changes beyond a clear confirmation state.

### Tokens
| Token | Value |
|---|---|
| Duration fast / base / slow | 0.15s / 0.25s / 0.5s |
| Ease out | `[0.22, 1, 0.36, 1]` |
| Spring (soft) | `stiffness 260, damping 28` |
| Stagger | 0.06s per item (max 8 items animated) |

### Shared variants (`components/motion/variants.ts`)
```ts
export const ease = [0.22, 1, 0.36, 1] as const;

export const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.35, ease } },
};

export const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.04 } },
};

export const scaleIn = {
  hidden: { opacity: 0, scale: 0.96 },
  show:   { opacity: 1, scale: 1, transition: { duration: 0.25, ease } },
};

export const shake = {
  x: [0, -8, 8, -6, 6, -3, 3, 0],
  transition: { duration: 0.4 },
};
```

### Where motion is used
| Area | Effect |
|---|---|
| Route change | Fade + 8px rise (`PageTransition`, `AnimatePresence mode="wait"`) |
| Lists/cards | Staggered fade-up on first load only |
| Sidebar active pill | Shared `layoutId` slide |
| Buttons | Press scale 0.98, loading spinner swap, success check |
| Dose "Taken" | Card collapses with check morph, count updates |
| Charts | Line draws in once (800 ms); tooltip fades |
| Modals/drawers | Scale-in / slide-in with backdrop fade |
| Toasts | Slide from top-right (bottom on mobile) |
| Upload | Progress bar + processing steps shimmer |
| Landing | Scroll-reveal sections, hero floating cards, step line draw, count-up stats |
| Auth | Staggered form entrance, field-error shake, success check |

```tsx
// app/providers.tsx
import { MotionConfig } from "motion/react";
export const Providers = ({ children }) => (
  <MotionConfig reducedMotion="user">{children}</MotionConfig>
);
```

## 8. Page loader and loading states

### 8.1 Initial splash (`PageLoader`)
Full-screen white with centred logo; a green heartbeat/pulse line draws across (SVG `pathLength` 0 -> 1), logo mark fades in, then the splash fades out when the app is ready. Minimum display 400 ms, maximum 3 s (then show app with skeletons). Also used while the PWA shell hydrates.

```tsx
import { motion } from "motion/react";

export function PageLoader() {
  return (
    <motion.div
      role="status" aria-label="Loading HealthMate"
      className="fixed inset-0 z-[100] grid place-items-center bg-white"
      initial={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.3 } }}>
      <div className="flex flex-col items-center gap-6">
        <svg width="160" height="48" viewBox="0 0 160 48" fill="none">
          <motion.path
            d="M0 24 H44 L54 8 L68 40 L80 18 L88 24 H160"
            stroke="var(--green-600)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
            initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
            transition={{ duration: 1.1, ease: "easeInOut", repeat: Infinity, repeatDelay: 0.3 }} />
        </svg>
        <motion.span className="font-display text-xl font-semibold text-[var(--green-800)]"
          initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          HealthMate AI
        </motion.span>
      </div>
    </motion.div>
  );
}
```

### 8.2 Route progress bar
Thin 3px green bar at the top that advances during route/data loading (`RouteProgress`), completes and fades. No full-screen blocking between routes.

### 8.3 Skeletons and states
- Every data block has: **Skeleton**, **Empty**, **Error (retry)**, **Permission denied**, **Success**.
- Skeleton = grey-green shimmer (CSS `background-position` animation; disabled for reduced motion).
- Buttons show inline spinner and keep width; forms keep input after errors.
- Uploads show stage chips: Uploaded -> Reading text -> Extracting -> Needs review.
- Offline: `OfflineBanner` with last-synced time; read-only cache.
- Cold start (free host asleep): after 4 s show "Waking up the server, this can take up to a minute" with animated pulse.

## 9. Component library

Build each with typed props, accessible name, focus ring (`--focus`), keyboard support, and Storybook-style examples (optional). All states documented.

### Primitives (`components/ui`)
| Component | Notes |
|---|---|
| Button | variants: primary, secondary, ghost, danger; sizes sm/md/lg; loading, icon-left/right |
| IconButton | tooltip required |
| Input, Textarea, PasswordInput, OTPInput | floating label optional, error + hint text, `aria-describedby` |
| Select, Combobox, DateInput, DateRangePicker | keyboard accessible |
| Checkbox, Radio, Switch | 44px hit area |
| Card | variants: flat, raised, interactive (hover lift) |
| Badge / StatusPill | Verified (green), Needs review (amber), Unverified (grey), Failed (red) with icon |
| Tabs, Accordion | Radix based, animated indicator |
| Dialog, Drawer, Sheet (mobile), Popover, Tooltip, DropdownMenu | focus trap, ESC, return focus |
| Toast | sonner, success/error/info, action button |
| Skeleton, Spinner, Progress | |
| Avatar | initials, relationship colour dot |
| Table / DataTable | sortable, stacked cards on mobile |
| Stepper | for register, share creation, visit pack |

### Health components (`components/health`)
| Component | Purpose |
|---|---|
| ProfileSwitcher | avatar + name + relation; menu with profiles; animated switch |
| StatCard | latest value, unit, date, delta arrow, sparkline, verification badge |
| TrendChart | Recharts line with reference band, source-linked points, table toggle, delta chip, date range |
| DoseCard | medicine time, discreet label option, Taken / Skip / Snooze buttons, status |
| AdherenceCalendar | month heat grid with legend (not colour only) |
| AppointmentCard | date, doctor, checklist progress |
| FileDropzone | drag/drop + camera capture, validation messages |
| ExtractionReviewPanel | original on the left, editable fields on the right, confidence flag, accept/edit/reject |
| CitationChip + EvidenceDrawer | `[S1]` chip opens source, page, date |
| AIAnswerCard | answer, citations, limitations, footer notice, report-issue |
| SafetyNotice | persistent "explains records, not diagnosis" |
| ShareScopeDialog | categories, date range, expiry, PIN |
| QRDisplay | QR + link, expiry countdown, revoke button, copy |
| AccessLogList | who/when/what |
| ConflictCard | side-by-side sources with dates and verification |
| ChangeCard | previous vs current value with neutral wording |
| QuotaMeter | "12 of 20 chats left today" |
| ChannelStatus | Push / Telegram / Email connected, delivery status |
| LanguageSwitcher | EN / BN / HI |
| SimpleModeToggle | |
| EmptyState, ErrorState, OfflineBanner, UpdateAvailableBanner | |

### Motion helpers (`components/motion`)
`FadeIn`, `Reveal` (scroll in-view once), `Stagger`, `AnimatedNumber` (count-up, final value in `aria-label`), `PageTransition`, `AnimatedCheck`, `Marquee` (landing only, pauses on hover and for reduced motion).

## 10. Landing page (public)

Purpose: explain the product in 30 seconds, build trust honestly, drive to register. No unverified claims (no fake user counts, no "bank-grade", no clinical promises).

### Layout and sections
| # | Section | Layout | Content | Animation |
|---|---|---|---|---|
| 1 | **Navbar** | Sticky, blur on scroll | Logo, links (Features, How it works, Privacy, FAQ), Login, **Get started** | Shrinks and gains shadow on scroll; mobile menu slides in |
| 2 | **Hero** | 2 columns (copy left, visual right); stacked on mobile | Headline: "One place for your family's health records." Sub: "Upload reports, track trends, never miss a dose, and share with your doctor by QR." CTAs: Get started, See how it works. Small note: "Demo uses synthetic data." | Headline words fade-up stagger; right side: product mockup with floating cards (BP trend, dose reminder, QR) drifting 6-8 px with slow loop; background green mesh blobs |
| 3 | **Trust strip** | Row of 4 chips | Private by default - You verify extracted data - Time-limited QR sharing - Works without AI | Fade-in stagger |
| 4 | **Problem -> Solution** | 2 columns | Scattered paper/WhatsApp photos vs one organised timeline | Before/after split reveal on scroll |
| 5 | **How it works** | 4 steps horizontal (vertical on mobile) | 1 Upload or scan, 2 Review extracted data, 3 Track trends and medicines, 4 Share with your doctor | Connecting line draws as you scroll; each step reveals |
| 6 | **Feature bento grid** | 3x2 bento cards | Records and OCR, Trend graphs, Medicine reminders, Doctor Visit Pack, Family profiles, Emergency card | Cards fade-up stagger; hover lift; small looping icon animation on hover only |
| 7 | **Trends demo** | Interactive card | Sample BP chart with draggable range, delta chip "+8 mmHg since March" (synthetic) | Line draws on view |
| 8 | **Doctor QR** | Phone mockup + steps | Choose what to share -> set expiry -> doctor scans -> read-only view -> revoke anytime | QR "scan line" sweeps; doctor view slides in |
| 9 | **Family** | Avatars row + permission card | Separate profiles, caregiver roles, you control access | Avatars pop in; permission toggles animate |
| 10 | **AI assistant** | Chat mockup | "What was my last HbA1c?" -> answer with [S1] citation chip -> source opens | Typewriter once, chip pulse |
| 11 | **Privacy and safety** | 3 columns | You own your data, export and delete, no diagnosis or prescribing, AI is optional | Fade-up |
| 12 | **Languages and accessibility** | Compact band | English, Bengali, Hindi, Simple mode, large text | Language chips cycle |
| 13 | **FAQ** | Accordion | Is it free? Is it a doctor? Who can see my data? What if reminders are late? | Smooth height animation |
| 14 | **Final CTA** | Full-width green panel, white text | "Start organising your family's health today." Button: Create free account | Subtle gradient shift, button glow on hover |
| 15 | **Footer** | 4 columns | Product, Privacy, Safety statement, Contact, language switcher | none |

Landing rules: hero LCP under 2.5 s, images lazy, illustrations as inline SVG, animations start in view only, no autoplay video. Include the medical safety line in the footer.

## 11. Login and Register (animated)

### Layout
```text
Desktop: 50/50 split                         Mobile: single column
+---------------------+-------------------+  +-------------------------+
| Brand panel (green) | Form card (white) |  | Logo                    |
| animated mesh,      |  Title            |  | Form card               |
| floating health     |  Fields           |  | (brand art collapses    |
| cards, tagline      |  Primary button   |  |  to a small header)     |
| safety note         |  Links            |  +-------------------------+
+---------------------+-------------------+
```
- Brand panel: green gradient (`--green-900 -> --green-700`), slow-moving blobs (CSS transforms), three floating cards (trend, dose, QR) with parallax on mouse move (disabled on touch and reduced motion), tagline "Carry your health, not your paperwork."
- Form side: white, max width 420px, centred, logo at top.

### Login
- Fields: email, password (show/hide), "Remember this device" (switch), Forgot password link, primary **Log in**.
- Animations: fields fade-up staggered on mount; label floats on focus; button shows spinner then check morph then route transition; wrong credentials -> card shake + inline error (generic message, no account hints); lockout state shows countdown.
- Optional second step: 2FA code (OTPInput) slides in from the right.
- Accessibility: autofocus email, Enter submits, error summary announced via `aria-live`.

### Register (3 steps with stepper)
1. **Account:** name, email, password with strength meter (animated bar + checklist), confirm.
2. **First profile:** "Who are you managing records for?" (Me / Parent / Child / Other), display name, timezone and language, optional notification preference.
3. **Consent:** plain-language privacy points, required consent checkbox (purpose + version), medical safety statement, "Create account".
- Step transitions: slide + fade (direction aware), progress bar fills, success screen with animated check and confetti-free subtle pulse, then redirect to Overview with a short onboarding checklist (Upload first report, Add a medicine, Set reminders).
- Also: Forgot password (email), Reset password, Verify email pages using the same layout.

### Form implementation pattern
```tsx
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, useAnimationControls } from "motion/react";
import { stagger, fadeUp, shake } from "@/components/motion/variants";

const schema = z.object({ email: z.string().email(), password: z.string().min(10) });

export function LoginForm({ onSubmit }: { onSubmit: (v: z.infer<typeof schema>) => Promise<void> }) {
  const controls = useAnimationControls();
  const { register, handleSubmit, formState: { errors, isSubmitting }, setError } =
    useForm({ resolver: zodResolver(schema) });

  const submit = handleSubmit(async (v) => {
    try { await onSubmit(v); }
    catch { setError("root", { message: "Email or password is incorrect." }); controls.start(shake); }
  });

  return (
    <motion.form onSubmit={submit} animate={controls}
      variants={stagger} initial="hidden" animate="show" className="space-y-4" noValidate>
      <motion.div variants={fadeUp}>{/* Input email */}</motion.div>
      <motion.div variants={fadeUp}>{/* PasswordInput */}</motion.div>
      <motion.div variants={fadeUp}>{/* Button loading={isSubmitting} */}</motion.div>
    </motion.form>
  );
}
```
(Use one animation owner per element; if mixing `animate` variants and controls, wrap the shake in an inner `motion.div`.)

## 12. Dashboard (rebuilt)

Goal: today's actions first, then latest numbers, then reviews.

```text
+--------------------------------------------------------------+
| Good morning, <name>   [Profile: Me v]   [Upload] [Log vital]|
+----------------------+----------------------+----------------+
| Today's medicines    | Next appointment     | Alerts         |
| DoseCards (Taken/    | date, doctor,        | needs review,  |
| Skip/Snooze)         | checklist            | low stock,     |
|                      |                      | quota          |
+----------------------+----------------------+----------------+
| Latest vitals: StatCards (BP, sugar, weight, HbA1c) with delta |
+---------------------------------------+----------------------+
| Trend chart (selectable metric)       | Review queue         |
|                                       | unverified items     |
+---------------------------------------+----------------------+
| Recent records | What changed (rule-based) | Record completeness |
+--------------------------------------------------------------+
```
- Greeting uses the user's name; no health claims.
- DoseCards respect discreet mode; "Taken" collapses the card with a check animation and updates adherence.
- StatCards show value, unit, date, verified badge, delta ("+8 mmHg since 12 Mar"), sparkline; unverified shown with amber badge.
- "What changed" and "Possibly missing" use neutral wording (see `INTELLIGENCE_ENGINE.md`).
- Mobile: single column order = Today's medicines, Next appointment, Alerts, Vitals, Trend, Review queue.
- Empty profile: onboarding checklist card with progress ring.

## 13. In-app screens (all rebuilt)
| Screen | Layout and key UI |
|---|---|
| **Health Records** | Search + filters + view toggle; upload dropzone (drag, camera); table/cards with status pills; detail page split view (source preview left, editable fields right) |
| **Timeline & Trends** | Metric picker, range, TrendChart with reference band and source links, table alternative, compare periods, change cards |
| **Medicines** | Today and all-medicines tabs; schedule editor (times, with food, course length); adherence calendar; refill meter; conflict cards |
| **Appointments** | Calendar + list, checklist (fasting, carry reports), post-visit notes and follow-up date |
| **Symptoms** | Quick add (text, severity chips, date), list grouped by day, include in Visit Pack toggle |
| **Doctor Visit Pack** | 3-step builder (period, sections, questions) with live preview, export PDF, create QR |
| **Sharing & Emergency Card** | Share wizard, active shares with countdown and revoke, access log; emergency card editor with preview |
| **AI Assistant** | Chat column 720px, suggested prompts, citation chips, evidence drawer, quota meter, safety notice, retrieval-only fallback banner |
| **Family** | Profile cards, roles, invite flow, permissions summary, revoke |
| **Privacy centre** | Access logs, linked channels, export data, delete request |
| **Settings** | Account, notification channels (Web Push, Telegram connect with code, email), discreet mode, quiet hours, language, Simple mode, install app guide |
| **Public doctor view** | Minimal header (patient label, scope, expiry countdown), tabs Summary/Labs/Vitals/Medicines/Documents, read-only watermark, no navigation into the app |

## 14. Content and UX rules
- Plain, non-alarming language: "above the reference range on this report" (never "dangerous").
- AI content always labelled, with sources and the footer: "This explains your records. Discuss decisions with your doctor."
- Reminder wording: "Reminder delivery may be delayed."
- Confirm before delete, revoke, merge, or irreversible actions (revoke share stays one tap, no confirm).
- No optimistic updates for verification or sharing permissions.
- Preserve form input after errors; show saved state.
- Profile switch: cancel in-flight queries, clear scoped cache, reset assistant context.

## 15. Accessibility and performance
**Accessibility (WCAG 2.2 AA goal):** full keyboard use, visible focus, labelled inputs, error summaries, `aria-live` for async status, charts with table alternative, reduced motion, 200% zoom, colour not sole signal, tap targets >= 44px, language attribute updates with i18n.
**Performance budget:** initial JS under ~200 KB gzip for landing, route-level code splitting, lazy-load charts and QR libs, images WebP/AVIF with width/height, fonts with `font-display: swap`, Lighthouse mobile >= 90 performance and 100 accessibility target on landing/login.
**PWA:** installable, offline shell + last synced dashboard (read-only), update banner.

## 16. Implementation order
| Step | Deliverable | Done when |
|---|---|---|
| 1 | Tokens, Tailwind config, fonts, globals | Style guide page renders all tokens |
| 2 | UI primitives + motion helpers | Components pass axe and keyboard tests |
| 3 | PageLoader, RouteProgress, skeleton/empty/error | Used by router |
| 4 | App shell (sidebar, topbar, mobile nav, profile switcher) | Navigates all stub routes |
| 5 | Auth pages (login, register 3 steps, forgot/reset/verify) | Works with real API, animations verified |
| 6 | Dashboard | All widgets wired or skeleton-ready |
| 7 | Records + upload + review | Upload to verified flow |
| 8 | Trends and charts | Reference band, table alternative |
| 9 | Medicines, appointments, symptoms | Dose actions work |
| 10 | Visit Pack, sharing, public doctor view | QR scan on phone tested |
| 11 | Assistant, family, privacy, settings | |
| 12 | Landing page | All sections, Lighthouse targets |
| 13 | i18n (EN/BN/HI), Simple mode, PWA | |
| 14 | Remove `_legacy`, final QA | Checklist below passes |

## 17. Definition of done (per screen)
- [ ] Matches tokens and spacing; no hard-coded colours.
- [ ] Loading, empty, error, permission-denied states.
- [ ] Keyboard and screen-reader pass (axe clean).
- [ ] Reduced-motion variant verified.
- [ ] Works at 360, 768, 1440 widths; no horizontal scroll.
- [ ] Uses real API types; no mock data left (except landing demo marked synthetic).
- [ ] Profile switch has no stale data.
- [ ] Copy follows content rules; AI content labelled.
- [ ] Vitest/Playwright tests added; screenshot reviewed.

## 18. Prompt for an AI coding agent
```text
Rebuild the HealthMate frontend from scratch following UI_README.md.
Do not touch backend or API contracts. Keep services/ and types.
Move the old UI to frontend/_legacy and exclude it from the build.
Use React + TypeScript + Vite + Tailwind + Radix + motion/react + lucide-react + Recharts + TanStack Query + react-hook-form + zod.
Use only the design tokens in section 5 (green and white palette).
Work in the order of section 16, one step at a time; after each step run lint, typecheck and tests, and report what you verified versus assumed.
Every screen needs loading, empty, error and permission-denied states, keyboard access, reduced-motion support, and neutral medical wording.
Use synthetic data only. Never add paid services or new dependencies without asking.
```

## 19. Open decisions
- Logo/wordmark and illustration style (inline SVG recommended).
- Dark mode: later, using the same variables.
- Exact hero copy after user interviews.
- Whether the landing page lives in the same app or a separate static site (separate is lighter and faster on free hosting).