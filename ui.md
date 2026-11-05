# HealthMate UI — Polish Pass and Modern React Upgrade

Based on the screenshot of the landing page at `localhost:5173`.

## 1. Good news: styling now works
Tailwind and the green/white tokens are being applied (coloured buttons, cards, spacing, badges). The earlier "no CSS" problem is fixed. What remains is **design quality** and **application architecture**.

## 2. What the screenshot shows (issues, by priority)

| # | Issue | Severity |
|---|---|---|
| 1 | **Final CTA headline is almost invisible** (dark text on the dark green panel). Needs white text. | Bug |
| 2 | **Navbar is not visible at the top**; it appears mid-page in the capture. Likely a fixed/sticky nav in a full-page screenshot, but verify it shows at scroll position 0 and stays on top. | Check |
| 3 | **No visual rhythm:** every section is the same white background with the same thin-border cards. Looks like a template wireframe. | High |
| 4 | **"Bento" grid is not bento:** six identical equal cards, tiny icons, no imagery. | High |
| 5 | **Hero lacks impact:** small mockup, lots of empty space, no gradient/mesh, no composition (dashboard + phone + chips). | High |
| 6 | **Trend demo is almost empty:** a flat line in a grey box. Needs a real chart (area gradient, axis, tooltip, reference band, animated draw). | High |
| 7 | **No product visuals:** sections describe features but show no real UI previews, illustrations or icons with depth. | High |
| 8 | **Type scale is timid** for a landing page; headings and section titles are small relative to the page. | Medium |
| 9 | **"How it works" steps** are four plain boxes with no connecting line or progress feel. | Medium |
| 10 | **Content claims to review:** "High accuracy", "Zero monetization", "Complete user control", "Immutable audit logs" must be true before launch. A real brand name ("Apollo Clinic") appears in the demo; use a fictional lab name. | Content/legal |
| 11 | **Jargon:** "Private & Strict Patient Data Sovereignty" and "Strict Evidence Match" read stiff. Use plain language. | Low |

Note: the screenshot is scaled down, so things look smaller than they are. Still review at 1440 px and 390 px.

## 3. "Modern React application" — what is probably missing

I can't see `package.json`, but the build log suggests many pieces were hand-rolled (custom Tabs, Dialog, SVG chart, view switching in `App.tsx`). Check with `npm ls --depth=0`. A modern production React app normally has:

| Area | Modern approach | Why |
|---|---|---|
| Routing | **React Router** with real URLs (`/login`, `/app/dashboard`, `/s/:token`), lazy routes, 404, route guards | Deep links, back button, shareable QR URLs, code splitting |
| Server state | **TanStack Query** (cache, retries, loading/error states, invalidation on profile switch) | Replaces manual fetch state; profile-scoped cache keys |
| Forms | **react-hook-form + zod** | Validation, accessibility, fewer bugs |
| Primitives | **Radix UI** (Dialog, Tabs, Tooltip, Dropdown, Accordion, Switch) | Focus trap, ARIA, keyboard handling done right |
| Class utilities | `clsx`, `tailwind-merge`, `class-variance-authority` | Clean component variants |
| Charts | **Recharts** (or visx) | Tooltips, responsive, reference areas, animation |
| Feedback | **sonner** toasts, error boundaries, `Suspense` fallbacks | Consistent UX |
| Motion | `motion` with `whileInView`, `layoutId`, `AnimatePresence` | Scroll reveals and shared-element transitions |
| Theming | CSS variables + optional dark mode | Polished feel |
| Quality | ESLint, Prettier, Playwright + axe, `vite-plugin-pwa` | Reliability |

Install (adjust to what you already have):
```powershell
cd frontend
npm i react-router-dom @tanstack/react-query react-hook-form zod @hookform/resolvers recharts sonner clsx tailwind-merge class-variance-authority lucide-react motion
npm i @radix-ui/react-dialog @radix-ui/react-tabs @radix-ui/react-tooltip @radix-ui/react-dropdown-menu @radix-ui/react-accordion @radix-ui/react-switch
npm i -D @playwright/test @axe-core/playwright vite-plugin-pwa
```
Migrate gradually; don't rewrite what already works. Replace hand-rolled primitives with Radix-wrapped ones one at a time and keep the tests green.

## 4. Route structure (target)
```tsx
// app/router.tsx
import { createBrowserRouter, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";
const Landing = lazy(() => import("@/features/landing/LandingPageView"));
const Login = lazy(() => import("@/features/auth/LoginPage"));
const Register = lazy(() => import("@/features/auth/RegisterPage"));
const AppShell = lazy(() => import("@/components/layout/AppShell"));
const Dashboard = lazy(() => import("@/features/dashboard/DashboardView"));
const DoctorView = lazy(() => import("@/features/sharing/PublicDoctorPortalView"));

export const router = createBrowserRouter([
  { path: "/", element: <Landing /> },
  { path: "/login", element: <Login /> },
  { path: "/register", element: <Register /> },
  { path: "/s/:token", element: <DoctorView /> },          // public QR view
  { path: "/app", element: <AppShell />, children: [          // guarded
      { index: true, element: <Navigate to="dashboard" replace /> },
      { path: "dashboard", element: <Dashboard /> },
      // records, trends, medicines, appointments, symptoms, visit-pack, sharing,
      // assistant, family, privacy, settings ...
  ]},
  { path: "*", element: <div>Not found</div> },
]);
```
Wrap with `<Suspense fallback={<PageLoader />}>`, `QueryClientProvider`, `MotionConfig reducedMotion="user"`, and an error boundary.

## 5. Visual fixes with code

### 5.1 Fix invisible CTA text (issue 1)
```tsx
<section className="bg-gradient-to-br from-green-900 to-green-700 text-white">
  <h2 className="text-4xl md:text-5xl font-display font-bold text-white">
    Start organising your family's health today.
  </h2>
  <p className="text-white/80">Create your free account, upload your first report.</p>
  <Button variant="inverse">Create free account</Button> {/* white bg, green text */}
</section>
```
Also scan for any other dark-on-dark text: search for `text-green-` inside dark panels.

### 5.2 Navbar always visible
```tsx
<header className="fixed inset-x-0 top-0 z-50 transition-colors
  data-[scrolled=true]:bg-white/80 data-[scrolled=true]:backdrop-blur data-[scrolled=true]:shadow-sm">
```
Add `pt-20` to the first section so content isn't hidden. Set `data-scrolled` from a scroll listener.

### 5.3 Section rhythm (issue 3)
Alternate backgrounds and add soft dividers:
```tsx
const bands = ["bg-white", "bg-green-50", "bg-white", "bg-[var(--bg)]", "bg-white", "bg-green-50"];
```
Use generous vertical padding (`py-20 md:py-28`), max width 1200px, and one accent shape (blurred green blob) behind hero and CTA.

### 5.4 Hero with depth (issue 5)
```tsx
<section className="relative overflow-hidden bg-gradient-to-b from-green-50 via-white to-white">
  <div aria-hidden className="absolute -top-32 -right-32 h-[520px] w-[520px] rounded-full bg-green-500/20 blur-3xl" />
  <div aria-hidden className="absolute top-40 -left-24 h-[360px] w-[360px] rounded-full bg-green-700/10 blur-3xl" />
  <div className="relative mx-auto max-w-[1200px] grid lg:grid-cols-2 gap-12 items-center py-24">
    <div>
      <h1 className="font-display font-bold tracking-tight text-[clamp(2.5rem,6vw,4.5rem)] leading-[1.05] text-green-900">
        One place for your <span className="text-green-600">family's health</span> records.
      </h1>
      {/* subtitle, CTAs, small safety note */}
    </div>
    <HeroComposition /> {/* browser-frame dashboard + phone with dose reminder + floating chips */}
  </div>
</section>
```
`HeroComposition`: a larger dashboard card (BP chart), a phone frame overlapping bottom-right showing a dose reminder, and two floating chips ("Verified", "Expires in 45m") drifting with slow `y` loops. Use real components with synthetic data, not images.

### 5.5 True bento grid (issue 4)
```tsx
<div className="grid grid-cols-1 md:grid-cols-6 gap-5 auto-rows-[220px]">
  <Card className="md:col-span-3 md:row-span-2">{/* Records + OCR: mini review UI */}</Card>
  <Card className="md:col-span-3">{/* Trends: mini sparkline chart */}</Card>
  <Card className="md:col-span-2">{/* Reminders */}</Card>
  <Card className="md:col-span-1">{/* Emergency card */}</Card>
  <Card className="md:col-span-2">{/* Visit Pack */}</Card>
  <Card className="md:col-span-4">{/* Family profiles with avatars */}</Card>
</div>
```
Each card contains a small live UI preview (mini chart, toggle, QR, avatars), 24-32 px icon in a tinted tile, hover lift (`hover:-translate-y-1 hover:shadow-raised`).

### 5.6 Real trend chart (issue 6)
```tsx
import { AreaChart, Area, XAxis, YAxis, Tooltip, ReferenceArea, ResponsiveContainer } from "recharts";

<ResponsiveContainer width="100%" height={280}>
  <AreaChart data={data}>
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="var(--green-600)" stopOpacity={0.35} />
        <stop offset="100%" stopColor="var(--green-600)" stopOpacity={0} />
      </linearGradient>
    </defs>
    <ReferenceArea y1={90} y2={120} fill="var(--green-100)" fillOpacity={0.6} />
    <XAxis dataKey="date" tickLine={false} axisLine={false} />
    <YAxis domain={[80, 160]} tickLine={false} axisLine={false} width={36} />
    <Tooltip />
    <Area type="monotone" dataKey="systolic" stroke="var(--green-700)" strokeWidth={3}
          fill="url(#g)" isAnimationActive animationDuration={900} />
  </AreaChart>
</ResponsiveContainer>
```
Include 6-12 sample points, range buttons (3M/6M/1Y) that change the data, delta chip, and a table toggle.

### 5.7 Scroll animations that are actually visible
```tsx
<motion.section initial={{ opacity: 0, y: 32 }} whileInView={{ opacity: 1, y: 0 }}
  viewport={{ once: true, margin: "-80px" }} transition={{ duration: 0.6, ease: [0.22,1,0.36,1] }}>
```
Stagger children in grids, draw the "How it works" connector line with `scaleX` tied to scroll (`useScroll`), animate counters once in view, and add hover states to every card and button.

### 5.8 Type and spacing
Hero `clamp(2.5rem, 6vw, 4.5rem)`; section titles `text-3xl md:text-5xl`; body `text-lg text-muted`; section padding `py-20 md:py-28`; container `max-w-[1200px] px-6`.

### 5.9 Content fixes
- Replace "Apollo Clinic" with a fictional lab ("Sample Diagnostics Lab").
- Replace jargon: "Private by design" instead of "Strict Patient Data Sovereignty"; "Answers come only from your records" instead of "Strict Evidence Match".
- Remove or verify claims: "High accuracy", "Zero monetization", "Complete user control", "Immutable audit logs", "100% free".
- Keep the safety line in the hero and footer.

## 6. Prompt for the coding agent
```text
The Tailwind/token styling now works, but the landing page and app look like a plain template and are missing modern React architecture. Follow UI_POLISH_PASS.md.

Do, in order, verifying each in a real browser with Playwright screenshots (1440px and 390px), and report what you verified vs assumed:
1. Fix the invisible final CTA text (white on green) and any other dark-on-dark text. Make the navbar fixed at the top with blur on scroll.
2. Add section rhythm: alternating backgrounds, larger type scale, 1200px container, blurred green blobs, hero gradient.
3. Rebuild the hero composition: dashboard card + phone mockup + floating chips (real components, synthetic data), with subtle motion.
4. Convert features into a true bento grid with live mini-previews and hover effects.
5. Replace the demo trend chart with Recharts (area gradient, reference band, tooltip, range buttons, table toggle).
6. Add scroll-reveal animations (whileInView, staggered), a scroll-drawn connector on How it works, and hover/focus states everywhere. Respect reduced motion.
7. Introduce React Router with real URLs (/, /login, /register, /app/*, /s/:token), lazy routes with Suspense + PageLoader, an error boundary and a 404 page.
8. Adopt TanStack Query for API data (profile-scoped keys, invalidate on profile switch) and react-hook-form + zod for forms. Migrate hand-rolled Dialog/Tabs/Tooltip/Accordion to Radix-based wrappers one at a time, keeping tests green.
9. Fix content: no real brand names in demo data, plain-language copy, remove unverified claims.
10. Add Playwright tests: styles applied, no console errors, navbar visible at top, CTA text contrast >= 4.5:1, axe has no serious violations, screenshots saved.
Do not change the green/white tokens or the safety wording. Do not add paid services.
```

## 7. Acceptance checklist
- [ ] Every section is visually distinct; no unreadable text (contrast >= 4.5:1).
- [ ] Hero has gradient depth, large type and a composed product mockup.
- [ ] Bento cards differ in size and contain live mini UI.
- [ ] Trend chart shows real points, tooltip, reference band, range buttons.
- [ ] Scroll animations visible once per section; reduced motion respected.
- [ ] URLs work (refresh on `/app/dashboard` keeps you there; `/s/:token` opens the doctor view).
- [ ] Lighthouse mobile performance >= 90, accessibility 100 on landing and login.
- [ ] Playwright screenshots reviewed at 1440 px and 390 px.