# HealthMate AI — Frontend (UI Design and Developer Guide)

React + TypeScript single-page app for HealthMate AI: landing page, animated login/register, and the full in-app experience (dashboard, records, trends, medicines, appointments, symptoms, Visit Pack, sharing, assistant, family, privacy, settings).

> **Safety statement (shown in the UI):** HealthMate AI explains records and supports doctor conversations. It never diagnoses or prescribes. All demo data is synthetic.

Save this file as `frontend/README.md`. Related docs: `UI_README.md` (design spec), `API.md`, `AUTH.md`, `AGENT_GUARDRAILS.md`.

---

## 1. Quick start (Windows PowerShell)

```powershell
cd frontend
npm install
npm run dev          # http://localhost:5173
```

| Command | Purpose |
|---|---|
| `npm run dev` | Dev server with hot reload |
| `npm run build` | Type-check (`tsc -b`) then production build to `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm test` / `npx vitest run` | Unit and integration tests (jsdom) |
| `npx vitest` | Watch mode |

Check `package.json` for the exact script names in your repo.

Requirements: Node 20+, npm 10+. The backend should run on `http://127.0.0.1:8000` (set the API base URL in `.env`, see section 12).

## 2. Tech stack

| Area | Choice |
|---|---|
| Framework | React 18, TypeScript, Vite 5 |
| Styling | Tailwind CSS (v3 style config) + CSS variable design tokens |
| Motion | `motion` / Framer Motion API (`MotionConfig reducedMotion="user"`) |
| Icons | lucide-react |
| Charts | Custom accessible SVG `TrendChart` (with table alternative) |
| Tests | Vitest + Testing Library (jsdom) |
| i18n | Lightweight context (`src/i18n`): English, Bengali, Hindi |
| PWA | `public/manifest.json`, offline banner |
| Fonts | Inter (body) and Plus Jakarta Sans (headings) with system fallbacks |

## 3. Project structure

```text
frontend/
  index.html
  public/manifest.json
  tailwind.config.js        postcss.config.js        vite.config.ts        tsconfig.json
  src/
    main.tsx                 App entry (imports CSS in the order shown in section 5)
    App.tsx                  Top-level routing, auth gate, profile scope, view transitions
    index.css                Tailwind directives
    styles/
      tokens.css             Colour, radius, shadow, focus variables (green + white)
      globals.css            Base typography, tabular numbers, 44px tap targets, .mode-simple
      motion.css             Shimmer, reduced-motion overrides
    api/client.ts            Typed API client (kept from the original app)
    services/authService.ts  Auth/session logic (kept)
    components/
      ui/                    Button, Input/PasswordInput, Card, Badge, Tabs, Dialog, Tooltip, Skeleton, Avatar
      motion/                variants.ts, MotionHelpers (FadeIn, Reveal, Stagger, AnimatedNumber, PageTransition, AnimatedCheck)
      feedback/              PageLoader, RouteProgress, States (Empty, Error, OfflineBanner, ColdStartBanner)
      layout/                AppShell, Sidebar, Topbar, MobileNav, PageHeader, ProfileSwitcher
      health/                StatCard, DoseCard, HealthCards, AIHealthComponents (citations, evidence, quota)
    features/
      landing/               LandingPageView (15 sections)
      auth/                  AuthLayout, LoginForm, RegisterForm (3 steps)
      dashboard/             DashboardView
      records/               HealthRecordsView, FileDropzone, ExtractionReviewPanel
      trends/                TimelineTrendsView, TrendChart
      medicines/             MedicinesView
      appointments/          AppointmentsView
      symptoms/              SymptomsJournalView
      visit-pack/            DoctorVisitPackView
      sharing/               SharingEmergencyView, PublicDoctorPortalView
      assistant/             AssistantView
      family/                FamilyView
      privacy/               PrivacyView
      settings/              SettingsView
      styleguide/            StyleGuidePage (token and component preview)
    i18n/                    en.json, bn.json, hi.json, i18nContext.tsx
```

## 4. Design system

### 4.1 Colour tokens (green + white)
Defined in `src/styles/tokens.css` and exposed to Tailwind.

| Token | Value | Use |
|---|---|---|
| `--green-900` | `#053F44` | Hover, brand panel |
| `--green-800` | `#075B63` | **Primary** buttons, headings accents |
| `--green-700` | `#087A83` | Active nav, links |
| `--green-600` | `#2E9B79` | Verified, success accent |
| `--green-500` | `#43B58F` | Highlights |
| `--green-100` | `#DDF3EA` | Chips, tints |
| `--green-50` | `#EEF8F4` | Section backgrounds |
| `--bg` | `#F5F8F8` | App background |
| `--surface` | `#FFFFFF` | Cards |
| `--border` | `#DCE6E7` | Borders |
| `--text` / `--muted` | `#172B32` / `#647780` | Text |
| `--warning` / `--danger` / `--info` | `#A96513` / `#B42332` / `#2563EB` | Status (always with icon + text) |

Rules: no hard-coded hex values in components; red only for errors; every colour pair meets WCAG AA; never rely on colour alone.

### 4.2 Typography, spacing, shape
Display 48-64, H1-H3 32/24/20, body 16 (Simple mode 20). Numbers use tabular figures. Spacing scale 4/8/12/16/24/32/48/64/96. Radius 8/12/20/28. Tap targets at least 44px.

### 4.3 Layout
- Breakpoints: 640 / 768 / 1024 / 1280 / 1536.
- Desktop: sidebar (240px, collapsible) + topbar + content (max 1280px; reading width 720px).
- Mobile: topbar + bottom nav (Home, Records, Medicines, Assistant, More).
- Active profile is always visible in the topbar; switching profile clears profile-scoped data.

### 4.4 Motion
| Token | Value |
|---|---|
| Durations | 0.15 s / 0.25 s / 0.5 s |
| Ease | `[0.22, 1, 0.36, 1]` |
| Stagger | 0.06 s (max 8 items) |

Where it appears: page transitions, staggered card entrance, sidebar active pill, dose "Taken" collapse + check, chart line draw, dialogs/toasts, upload stages, landing scroll reveals and floating hero cards, login shake on error, register step slide.
Rules: only animate `transform` and `opacity`; respect reduced motion; never hide a real medical value behind an animation.

### 4.5 Loading and feedback
`PageLoader` (heartbeat line splash, min 400 ms, max 3 s), `RouteProgress` (3px top bar), skeleton shimmer, `EmptyState`, `ErrorState`, `OfflineBanner`, `ColdStartBanner` ("Waking up the server, this can take up to a minute").

## 5. Tailwind and CSS setup (read this if the UI looks unstyled)

If the built CSS file is tiny (a few kB), Tailwind is not generating utilities.

**Import order in `src/main.tsx`:**
```tsx
import "./styles/tokens.css";   // variables first
import "./index.css";           // Tailwind directives
import "./styles/globals.css";
import "./styles/motion.css";
```

**`src/index.css` (Tailwind v3):**
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

**`postcss.config.js`:**
```js
export default { plugins: { tailwindcss: {}, autoprefixer: {} } };
```

**`tailwind.config.js` essentials:**
```js
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        green: { 50:"var(--green-50)", 100:"var(--green-100)", 500:"var(--green-500)",
                 600:"var(--green-600)", 700:"var(--green-700)", 800:"var(--green-800)", 900:"var(--green-900)" },
        surface: "var(--surface)", bg: "var(--bg)", border: "var(--border)",
        text: "var(--text)", muted: "var(--muted)",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        display: ["Plus Jakarta Sans", "Inter", "system-ui", "sans-serif"],
      },
      borderRadius: { DEFAULT: "12px", lg: "20px", xl: "28px" },
      boxShadow: { card: "var(--shadow-1)", raised: "var(--shadow-2)" },
    },
  },
  plugins: [],
};
```

**Version check:** `npm ls tailwindcss`. v3 uses the files above. v4 ignores `tailwind.config.js`, needs `@import "tailwindcss";` and `@tailwindcss/vite`. Do not mix them.

**Verify output size:**
```powershell
Remove-Item -Recurse -Force node_modules\.vite, dist -ErrorAction SilentlyContinue
npm run build
Get-ChildItem dist\assets\*.css | Select Name, Length
```
A healthy build is well above 20 kB. If it is still ~3 kB, check `content` globs, directives, PostCSS config, and that components use class names that exist in the theme.

## 6. Screens and what they do

| Screen | Key UI |
|---|---|
| **Landing** | Sticky blur navbar, hero with floating cards, trust strip, problem/solution, how it works, bento features, trends demo, doctor QR, family, AI assistant preview, privacy and safety, languages, FAQ, final CTA, footer with safety notice |
| **Login** | 50/50 split, animated brand panel, staggered fields, shake on error, lockout countdown, show/hide password |
| **Register** | 3 steps: account (strength meter) -> first profile -> consent and safety acknowledgement |
| **Dashboard** | Today's medicines (Taken/Skip/Snooze), next appointment, review queue, StatCards (BP, glucose, weight, HbA1c) |
| **Health Records** | Upload (drag/camera), status pills, split review: original document vs editable extracted fields |
| **Timeline & Trends** | Metric picker, reference bands, delta chips, source links, table alternative |
| **Medicines** | Schedule editor, refill meter, adherence calendar |
| **Appointments** | Calendar/list, visit checklist |
| **Symptoms** | Severity entries, include-in-Visit-Pack toggle |
| **Doctor Visit Pack** | 3-step builder, questions, printable view, PDF export |
| **Sharing & Emergency** | Time-limited PIN share, revoke, public read-only doctor view with watermark |
| **AI Assistant** | 720px chat, prompt chips, quota meter, `[S1]` citation chips, evidence drawer |
| **Family** | Profile cards, caregiver roles, invites |
| **Privacy** | Access log, linked channels, export, delete request |
| **Settings** | Notification channels (Push, Telegram, Email), discreet mode, quiet hours, language, Simple mode |

## 7. Component conventions
- Typed props; forward refs on form primitives; one component per file.
- Every interactive element: accessible name, visible focus ring (`--focus`), keyboard operation.
- Every data view has **loading, empty, error and permission-denied** states.
- Use tokens only; no inline hex colours.
- Animations through shared variants in `components/motion/variants.ts`; wrap shake-style effects in an inner element to avoid animation prop conflicts.
- Medical wording: neutral ("above the reference range"), never "dangerous", "you have", or dose advice. AI content is labelled with sources and the footer: "This explains your records. Discuss decisions with your doctor."

## 8. Data and API
- All requests go through `src/api/client.ts` (typed). Do not call `fetch` directly in components.
- Profile-scoped data is keyed by the active profile; switching profile resets caches and assistant context.
- Verification and sharing permission changes are never optimistic.
- Auth/session rules follow `AUTH.md`. Recommended: access token in memory, refresh token in an HttpOnly cookie. Frontend and API should share a parent domain (or use a proxy) so cookies work on iPhone Safari.

## 9. Accessibility
WCAG 2.2 AA target: full keyboard use, visible focus, labelled inputs, error summaries with `aria-live`, chart table alternative, reduced motion, 200% zoom without horizontal scroll, `lang` updates with language, tap targets at least 44px, no colour-only meaning.

## 10. Performance
- Current production build reports a ~538 kB JS chunk (about 149 kB gzip). Reduce with `React.lazy` route splitting and `manualChunks` for vendor code.
- Lazy-load landing sections, QR and chart code; animate transform/opacity only.
- Images WebP/AVIF with explicit width/height; fonts with `font-display: swap`.
- Targets: Lighthouse mobile performance >= 90, accessibility 100 on landing and login.

## 11. Testing

| Level | How |
|---|---|
| Unit/integration | Vitest + Testing Library (jsdom) for components and flows |
| Visual/CSS | **Playwright** screenshots (jsdom does not load Tailwind or real CSS) |
| Accessibility | axe in Playwright and component tests |
| E2E | Landing -> register -> login -> dashboard -> upload -> verify -> trends -> share |

**Important:** passing Vitest does not prove the UI looks right. Add a Playwright smoke test that fails if `--green-800` is empty, the primary button background is transparent, or the CSS bundle is suspiciously small:

```ts
import { test, expect } from "@playwright/test";

test("styles are applied", async ({ page }) => {
  await page.goto("/");
  const token = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue("--green-800").trim());
  expect(token).not.toBe("");
  const btn = page.getByRole("button", { name: /get started/i }).first();
  const bg = await btn.evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(bg).not.toBe("rgba(0, 0, 0, 0)");
});
```
Take screenshots at 1440 px and 390 px for landing, login, register and dashboard, and review them before merging.

## 12. Environment variables
Create `frontend/.env`:
```dotenv
VITE_API_URL=http://127.0.0.1:8000/api/v1
```
Never put secrets in frontend env files; anything prefixed `VITE_` is public.

## 13. Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| No colours, plain HTML look, CSS ~3 kB | Tailwind not generating utilities | Section 5: directives, PostCSS config, `content` globs, version match |
| Colours missing but layout works | Token file not imported or class names not in theme | Import order in `main.tsx`; map tokens in `tailwind.config.js` |
| No animations | OS "Animation effects" off, or reduced-motion emulation | Enable in Windows settings; DevTools Rendering -> `prefers-reduced-motion: no-preference` |
| Old UI shows | Stale service worker or Vite cache | Unregister the service worker, delete `node_modules\.vite`, hard refresh |
| Weird file-watch or stale files | Project inside OneDrive | Pause sync or move to `C:\dev\Healthmate_AI` |
| `motion/react` import errors | Package/alias mismatch | Use one package consistently (`motion` or `framer-motion`) and keep aliases in `vite.config.ts` and `tsconfig.json` in sync |
| Login works then logs out on iPhone | Cross-site refresh cookie blocked | Same parent domain or same-origin proxy |
| First request very slow | Free host cold start | Expected; `ColdStartBanner` explains; cron keep-alive in `DEPLOYMENT.md` |

## 14. Deployment (Vercel)
1. Set `VITE_API_URL` in Vercel project settings.
2. Build command `npm run build`, output `dist`.
3. Add the Vercel domain to the backend CORS allow-list (no trailing slash).
4. Prefer same-site cookies via custom domain or a rewrite from `/api` to the backend.
5. After deploy: smoke test landing, register, login, dashboard, share link, and the Lighthouse targets.

## 15. Contribution checklist (per screen)
- [ ] Uses tokens and spacing scale; no hard-coded colours
- [ ] Loading, empty, error, permission-denied states
- [ ] Keyboard and screen-reader pass (axe clean)
- [ ] Reduced-motion verified
- [ ] 360, 768 and 1440 px layouts, no horizontal scroll
- [ ] Real API types; synthetic demo data only where labelled
- [ ] Neutral medical wording; AI content labelled with sources
- [ ] Vitest tests plus Playwright screenshot reviewed

## 16. Status
The agent-run rebuild reports 92 passing Vitest tests and a successful production build, with the old UI removed. **Visual verification in a real browser is still required** (styles, colours and animations); see sections 5 and 11 before treating the UI as done.