/**
 * Every signed-in page, at desktop AND phone width (real API):
 * no horizontal overflow, no console errors, no critical accessibility violations.
 * Needs the API (E2E_API_URL, default http://127.0.0.1:8010) and a build pointing at it.
 */
import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const API = process.env.E2E_API_URL ?? "http://127.0.0.1:8010";
const TOKEN_KEY = "healthmate_access_token";
const ROUTES = [
  "dashboard", "records", "trends", "medicines", "appointments", "symptoms",
  "visit-pack", "assistant", "family", "sharing", "privacy", "settings",
];

let token = "";
const consoleErrors: string[] = [];

test.beforeAll(async ({ request }) => {
  const email = `layout.${Date.now()}@example.com`;
  const password = "Synthetic#Pass123";
  const reg = await request.post(`${API}/api/auth/register`, { data: { name: "Layout Tester", email, password } });
  expect(reg.ok()).toBeTruthy();
  const login = await request.post(`${API}/api/auth/login`, { data: { email, password } });
  token = (await login.json()).access_token;
});

async function signedIn(page: Page) {
  await page.addInitScript(([k, v]) => window.sessionStorage.setItem(k, v), [TOKEN_KEY, token]);
  page.on("console", (m) => {
    if (m.type() === "error" && !/Failed to load resource/.test(m.text())) consoleErrors.push(`${m.text()}`);
  });
  page.on("pageerror", (e) => consoleErrors.push(`pageerror: ${e.message}`));
}

for (const route of ROUTES) {
  test(`/app/${route}: fits the viewport, no console errors, no critical a11y violations`, async ({ page }, testInfo) => {
    consoleErrors.length = 0;
    await signedIn(page);
    await page.goto(`/app/${route}`);
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible({ timeout: 15_000 });
    await page.waitForLoadState("networkidle");

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, "horizontal overflow in px").toBeLessThanOrEqual(1);

    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    const critical = results.violations.filter((v) => v.impact === "critical");
    expect(critical.map((v) => `${v.id}: ${v.nodes[0]?.html?.slice(0, 120)}`)).toEqual([]);

    expect(consoleErrors).toEqual([]);
    if (route === "dashboard") await page.screenshot({ path: `test-results/app-${testInfo.project.name.toLowerCase()}-dashboard.png`, fullPage: true });
  });
}
