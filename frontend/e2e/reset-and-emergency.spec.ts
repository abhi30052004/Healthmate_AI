/**
 * Real-browser checks for password reset and the public emergency-card QR.
 *
 * Needs the same throwaway API as full-flow.spec.ts, started with its output redirected to a file:
 * with no SMTP configured, development mode logs the reset link there, which is how this spec
 * "receives" the email. Point E2E_SERVER_LOG at that file (default: backend/smoke_server.err).
 */
import { test, expect, type Page } from "@playwright/test";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const API = process.env.E2E_API_URL ?? "http://127.0.0.1:8010";
const LOG = process.env.E2E_SERVER_LOG ?? path.resolve(__dirname, "../../backend/smoke_server.err");

const stamp = Date.now();
const EMAIL = `reset.${stamp}@example.com`;
const OLD_PW = "Synthetic#Pass123";
const NEW_PW = "BrandNew#Pass456";

test.describe.configure({ mode: "serial" });
test.skip(({ isMobile }) => !!isMobile, "desktop journey");

async function signIn(page: Page, password: string) {
  await page.goto("/login");
  await page.getByLabel(/Email Address/i).fill(EMAIL);
  await page.getByLabel(/^Password/i).fill(password);
  await page.getByRole("button", { name: /Sign In to Workspace/i }).click();
}

test.beforeAll(async () => {
  const res = await fetch(`${API}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Reset Tester", email: EMAIL, password: OLD_PW }),
  });
  expect(res.status).toBe(201);
});

test("forgot password: emailed link sets a new password, old one stops working, link is single-use", async ({ page, browser }) => {
  await page.goto("/login");
  await page.getByRole("button", { name: /Forgot password/i }).click();
  await expect(page).toHaveURL(/\/forgot-password/);
  await expect(page.getByRole("heading", { name: /Reset your password/i })).toBeVisible();
  await page.getByLabel(/Email Address/i).fill(EMAIL);
  await page.getByRole("button", { name: /Email me a reset link/i }).click();
  await expect(page.getByTestId("reset-link-sent")).toContainText(/If an account exists/);

  // The "email": development mode writes the link to the server log when SMTP is not configured.
  let link = "";
  await expect
    .poll(
      () => {
        const text = fs.existsSync(LOG) ? fs.readFileSync(LOG, "utf8") : "";
        const hits = [...text.matchAll(new RegExp(`for ${EMAIL.replace(/\./g, "\\.")}: (\\S+/reset-password\\?token=\\S+)`, "g"))];
        link = hits.length ? hits[hits.length - 1][1] : "";
        return link;
      },
      { timeout: 15_000 }
    )
    .toMatch(/reset-password\?token=/);
  const url = new URL(link);
  const resetUrl = `/reset-password${url.search}`;

  await page.goto(resetUrl);
  await page.getByLabel(/^New password/i).fill(NEW_PW);
  await page.getByLabel(/Confirm new password/i).fill(NEW_PW);
  await page.getByRole("button", { name: /Update password/i }).click();
  await expect(page).toHaveURL(/\/login/);

  await signIn(page, OLD_PW);
  await expect(page.getByRole("alert")).toContainText(/Invalid email address or password/i);
  await signIn(page, NEW_PW);
  await expect(page).toHaveURL(/\/app\/dashboard/, { timeout: 20_000 });

  const again = await browser.newPage();
  await again.goto(resetUrl);
  await again.getByLabel(/^New password/i).fill("Another#Pass789");
  await again.getByLabel(/Confirm new password/i).fill("Another#Pass789");
  await again.getByRole("button", { name: /Update password/i }).click();
  await expect(again.getByRole("alert")).toContainText(/invalid or has expired/i);
  await again.close();
});

test("emergency QR: off by default, scannable when on, replaced QR kills the old one, off hides it", async ({ page, browser }) => {
  await signIn(page, NEW_PW);
  await expect(page).toHaveURL(/\/app\/dashboard/, { timeout: 20_000 });
  await page.goto("/app/sharing");
  await page.getByRole("tab", { name: /Emergency card/i }).click();
  await page.getByLabel("Blood type").fill("B+");
  await page.getByLabel("Emergency contact", { exact: true }).fill("Sam Tester");
  await page.getByLabel("Contact phone").fill("+91 90000 11111");
  await page.getByLabel("Allergies").fill("Penicillin");
  await page.getByRole("button", { name: /^Save$/ }).click();
  await expect(page.getByText("Emergency card saved.")).toBeVisible();

  await expect(page.getByRole("button", { name: /Turn on emergency QR/i })).toBeVisible();
  await page.getByRole("button", { name: /Turn on emergency QR/i }).click();
  const field = page.getByRole("textbox", { name: "Emergency card link" });
  await expect(field).toBeVisible();
  const first = await field.inputValue();
  expect(first).toMatch(/\/e\/[A-Za-z0-9_-]{30,}/);

  const guest = await browser.newPage();
  await guest.goto(first);
  const card = guest.getByTestId("public-emergency-card");
  await expect(card).toContainText("Reset Tester");
  await expect(card).toContainText("B+");
  await expect(card).toContainText("Penicillin");
  await expect(guest.getByRole("link", { name: /Call/ })).toHaveAttribute("href", "tel:+919000011111");
  expect(await guest.content()).not.toContain(EMAIL); // owner's email never appears
  await guest.close();

  await page.getByRole("button", { name: /New QR \(cancel old\)/i }).click();
  await expect(page.getByText(/Old printed QR codes no longer work/)).toBeVisible();
  await expect.poll(async () => field.inputValue()).not.toBe(first);

  const stale = await browser.newPage();
  await stale.goto(first);
  await expect(stale.getByRole("alert")).toContainText(/isn't available/i);
  await stale.close();

  const second = await field.inputValue();
  await page.getByRole("button", { name: /^Turn off$/ }).click();
  await expect(page.getByRole("button", { name: /Turn on emergency QR/i })).toBeVisible();
  const off = await browser.newPage();
  await off.goto(second);
  await expect(off.getByRole("alert")).toContainText(/isn't available/i);
  await off.close();
});
