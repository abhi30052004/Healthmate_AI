/**
 * End-to-end journey against a REAL backend (no mocks).
 *
 *   1. start the API on a throwaway database (see README "End-to-end tests")
 *   2. VITE_API_BASE_URL=<that api> npm run build
 *   3. npx playwright test full-flow --project=Desktop
 *
 * Uses only synthetic data. One serial scenario, because each step builds on the last.
 */
import { test, expect, type Page } from "@playwright/test";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE = path.resolve(__dirname, "../../fixtures/synthetic_reports/report_03_glucose_2025-04-02.pdf");

const stamp = Date.now();
const EMAIL = `e2e.${stamp}@example.com`;
const PASSWORD = "Synthetic#Pass123";
const NAME = "Eva Tester";

const pad = (n: number) => String(n).padStart(2, "0");
const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const daysAgo = (n: number) => iso(new Date(Date.now() - n * 86_400_000));
const daysAhead = (n: number) => iso(new Date(Date.now() + n * 86_400_000));

async function openApp(page: Page, route: string) {
  await page.goto(`/app/${route}`);
  await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
}

test.describe.configure({ mode: "serial" });

test.describe("HealthMate full journey (real API)", () => {
  test.skip(({ isMobile }) => !!isMobile, "journey runs on desktop; layout checks cover mobile");

  let page: Page;
  let shareUrl = "";
  const consoleErrors: string[] = [];

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    page.on("console", (m) => {
      if (m.type() === "error" && !/Failed to load resource/.test(m.text())) consoleErrors.push(m.text());
    });
    page.on("pageerror", (e) => consoleErrors.push(`pageerror: ${e.message}`));
  });
  test.afterAll(async () => {
    await page.close();
  });

  test("protected pages redirect anonymous visitors to login", async () => {
    await page.goto("/app/dashboard");
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByText(/Welcome back/i)).toBeVisible();
  });

  test("register creates an account and lands in the workspace", async () => {
    await page.goto("/register");
    await page.getByLabel(/Full Name/i).fill(NAME);
    await page.getByLabel(/Email Address/i).fill(EMAIL);
    await page.getByLabel(/^Password/i).fill(PASSWORD);
    await page.getByLabel(/Confirm Password/i).fill(PASSWORD);
    await page.getByRole("button", { name: /Continue to Patient Profile/i }).click();
    await page.getByLabel(/Profile Display Name/i).fill(NAME);
    await page.getByRole("button", { name: /Review Consent/i }).click();
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: /Create Account/i }).click();

    await expect(page).toHaveURL(/\/app\/dashboard/, { timeout: 20_000 });
    await expect(page.getByRole("heading", { name: new RegExp(`Hello, ${NAME}`) })).toBeVisible();
    await expect(page.getByText("No verified results yet")).toBeVisible();
  });

  test("wrong password is rejected, session survives reload, logout works", async ({ browser }) => {
    const anon = await browser.newPage();
    await anon.goto("/login");
    await anon.getByLabel(/Email Address/i).fill(EMAIL);
    await anon.getByPlaceholder("••••••••••••").fill("Wrong#Pass999");
    await anon.getByRole("button", { name: /Sign In to Workspace/i }).click();
    await expect(anon.getByRole("alert")).toContainText(/Invalid email address or password/i);
    await anon.close();

    await page.reload();
    await expect(page).toHaveURL(/\/app\/dashboard/);
    await expect(page.getByRole("heading", { name: new RegExp(`Hello, ${NAME}`) })).toBeVisible();
  });

  test("records: add results manually (vitals + labs on two dates)", async () => {
    await openApp(page, "records");
    await expect(page.getByText("No records yet")).toBeVisible();

    // today's vitals
    await page.getByRole("button", { name: /Add results manually/i }).first().click();
    const dlg = page.getByRole("dialog");
    await dlg.getByLabel("Value").nth(0).fill("128");
    await dlg.getByLabel("Value").nth(1).fill("82");
    await dlg.getByRole("button", { name: /Save results/i }).click();
    await expect(page.getByText("Results saved.")).toBeVisible();
    await expect(page.getByText(/Manual entry - Vitals/)).toBeVisible();

    // an older glucose value, then a newer one, so a trend exists
    for (const [offset, value] of [[60, "104"], [10, "118"]] as const) {
      await page.getByRole("button", { name: /Add results manually/i }).first().click();
      const d = page.getByRole("dialog");
      await d.getByRole("button", { name: "Lab results" }).click();
      await d.getByLabel("Test").first().fill("Fasting Blood Glucose");
      await d.getByLabel("Value").first().fill(value);
      await d.getByLabel("Unit").first().fill("mg/dL");
      await d.getByLabel("Reference range").first().fill("70 - 99");
      await d.getByLabel("Date").fill(daysAgo(offset));
      await d.getByRole("button", { name: /Save results/i }).click();
      await expect(page.getByText("Results saved.").first()).toBeVisible();
    }
    await expect(page.getByText(/Manual entry - Lab results/)).toHaveCount(2);
  });

  test("records: future dates and empty values are rejected", async () => {
    await page.getByRole("button", { name: /Add results manually/i }).first().click();
    const d = page.getByRole("dialog");
    await d.getByRole("button", { name: "Other", exact: true }).click();
    await d.getByRole("button", { name: /Save results/i }).click();
    await expect(d.getByRole("alert")).toBeVisible();
    await d.getByRole("button", { name: /Cancel/i }).click();
  });

  test("records: upload a PDF, review the extracted values, verify", async () => {
    await page.locator('input[type="file"]').first().setInputFiles(FIXTURE);
    await expect(page.getByText(/report_03_glucose/i).first()).toBeVisible({ timeout: 30_000 });
    await page.getByRole("button", { name: /Review results/i }).first().click();
    const panel = page.getByRole("dialog", { name: /Review extracted results/i });
    await expect(panel).toBeVisible();
    await expect(panel.getByText(/Results \(\d+\)/)).toBeVisible();
    await panel.getByRole("button", { name: /Confirm & save as verified/i }).click();
    await expect(page.getByText(/Marked as verified/i)).toBeVisible();
    await expect(page.getByText("Needs review", { exact: true }).first()).toBeVisible();
  });

  test("trends: verified results are charted with sources", async () => {
    await openApp(page, "trends");
    await expect(page.getByRole("button", { name: /Fasting Blood Glucose|Glucose/i }).first()).toBeVisible();
    await expect(page.getByRole("table")).toBeVisible();
    await expect(page.getByText("118").first()).toBeVisible();
  });

  test("medicines: add a scheduled medication, record a dose, it persists", async () => {
    await openApp(page, "medicines");
    await page.getByRole("button", { name: /Add medication/i }).first().click();
    const d = page.getByRole("dialog");
    await d.getByLabel(/Medication name/i).fill("Metformin");
    await d.getByLabel(/Strength/i).fill("500 mg tablet");
    await d.getByRole("button", { name: "Twice daily" }).click();
    await d.getByRole("button", { name: /^Add medication$/i }).click();
    await expect(page.getByText("Medication added.")).toBeVisible();

    await expect(page.getByTestId("dose-card")).toHaveCount(2);
    await page.getByTestId("dose-card").first().getByRole("button", { name: /I took it/i }).click();
    await expect(page.getByTestId("dose-card").first()).toHaveAttribute("data-status", "taken");

    await page.reload();
    await expect(page.getByTestId("dose-card").first()).toHaveAttribute("data-status", "taken");
    await expect(page.getByTestId("dose-card").nth(1)).toHaveAttribute("data-status", /pending|skipped/);

    // undo
    await page.getByTestId("dose-card").first().getByRole("button", { name: /Undo/i }).click();
    await expect(page.getByTestId("dose-card").first()).toHaveAttribute("data-status", "pending");
  });

  test("appointments: schedule a visit with a checklist item", async () => {
    await openApp(page, "appointments");
    await page.getByRole("button", { name: /Add appointment/i }).first().click();
    const d = page.getByRole("dialog");
    await d.getByLabel(/Reason for visit/i).fill("Diabetes check-up");
    await d.getByLabel(/Doctor \/ clinic/i).fill("Dr. Mukherjee");
    await d.getByLabel("Date").fill(daysAhead(3));
    await d.getByLabel("Time").fill("11:30");
    await d.getByLabel(/Remind me/i).selectOption("1h");
    await d.getByRole("button", { name: /^Add appointment$/i }).click();
    await expect(page.getByText("Appointment added.")).toBeVisible();
    await expect(page.getByText("Diabetes check-up")).toBeVisible();

    await page.getByRole("button", { name: "+ Bring recent lab reports" }).click();
    const item = page.getByRole("button", { name: "Bring recent lab reports", exact: true });
    await expect(item).toBeVisible();
    await item.click();
    await expect(item).toHaveAttribute("aria-pressed", "true");
  });

  test("symptoms: log, hide from visit pack, validation", async () => {
    await openApp(page, "symptoms");
    await page.getByRole("button", { name: /Save entry/i }).click();
    await expect(page.getByRole("alert").first()).toContainText(/Describe/i);
    await page.getByLabel(/What did you notice/i).fill("Dizziness on standing");
    await page.getByRole("radio", { name: "moderate" }).click();
    await page.getByRole("button", { name: /Save entry/i }).click();
    await expect(page.getByTestId("symptom-entry")).toHaveCount(1);
    await expect(page.getByTestId("symptom-entry").getByRole("button", { name: /In visit pack/i })).toHaveAttribute("aria-pressed", "true");
  });

  test("visit pack: preview shows real data and the PDF downloads", async () => {
    await openApp(page, "visit-pack");
    const preview = page.getByTestId("visit-pack-preview");
    await expect(preview.getByText("Metformin", { exact: true })).toBeVisible({ timeout: 15_000 });
    await expect(preview.getByText(/Fasting.*Glucose/).first()).toBeVisible();
    await expect(preview.getByText(/Dizziness on standing/)).toBeVisible();

    await page.getByLabel("Add a question").fill("What follow-up tests would you suggest?");
    await page.getByRole("button", { name: /^Add$/ }).click();
    await expect(preview.getByText(/What follow-up tests/)).toBeVisible();

    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: /Download PDF/i }).click(),
    ]);
    expect(download.suggestedFilename()).toMatch(/\.pdf$/);
  });

  test("assistant: answers from records with citations or says it can't, and looks up terms", async () => {
    await openApp(page, "assistant");
    await page.getByLabel("Ask a question about your records").fill("What was my latest fasting blood glucose?");
    await page.getByRole("button", { name: /^Ask$/ }).click();
    await expect(page.getByText(/This explains your records/i).first()).toBeVisible({ timeout: 30_000 });

    await page.getByRole("tab", { name: /Medical terms/i }).click();
    await page.getByLabel("Term or question").fill("HbA1c");
    await page.getByRole("button", { name: /Look up/i }).click();
    await expect(page.getByTestId("reference-result")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(/not from your records/i)).toBeVisible();
  });

  test("family: a second profile is isolated from the first", async () => {
    await openApp(page, "family");
    await page.getByRole("button", { name: /Add family profile/i }).click();
    const d = page.getByRole("dialog");
    await d.getByLabel(/Full name/i).fill("Aarav Tester");
    await d.getByLabel(/Relationship/i).selectOption("child");
    await d.getByLabel(/Known allergies/i).fill("Penicillin");
    await d.getByRole("button", { name: /Add profile/i }).click();
    await expect(page.getByText("Aarav Tester added.")).toBeVisible();

    await page.getByRole("button", { name: /Switch to Aarav/i }).click();
    await openApp(page, "records");
    await expect(page.getByText("No records yet")).toBeVisible();
    await openApp(page, "medicines");
    await expect(page.getByText("Nothing scheduled today")).toBeVisible();
    await openApp(page, "symptoms");
    await expect(page.getByText("No entries yet")).toBeVisible();

    await openApp(page, "family");
    await page.getByRole("button", { name: new RegExp(`Switch to ${NAME.split(" ")[0]}`) }).click();
    await openApp(page, "records");
    await expect(page.getByText(/Manual entry - Vitals/)).toBeVisible();
  });

  test("sharing: create a doctor link, open it signed-out, revoke it", async ({ browser }) => {
    await openApp(page, "sharing");
    await page.getByRole("button", { name: /New share link/i }).first().click();
    const d = page.getByRole("dialog");
    await d.getByLabel(/Doctor or clinic/i).fill("Dr. Mukherjee");
    await d.getByRole("button", { name: /Create link/i }).click();
    const link = page.getByRole("textbox", { name: "Share link" });
    await expect(link).toBeVisible();
    shareUrl = await link.inputValue();
    expect(shareUrl).toMatch(/\/s\/[A-Za-z0-9_-]{20,}/);
    await page.getByRole("button", { name: "Done" }).click();

    const guest = await browser.newPage();
    await guest.goto(shareUrl);
    await expect(guest.getByRole("heading", { name: NAME })).toBeVisible({ timeout: 15_000 });
    await expect(guest.getByText("Metformin")).toBeVisible();
    // never leaks into the page: the secret token and the owner's email
    expect(await guest.content()).not.toContain(EMAIL);
    await guest.close();

    await page.getByRole("button", { name: "Revoke" }).first().click();
    await page.getByRole("dialog").getByRole("button", { name: "Revoke" }).click();
    await expect(page.getByText(/Link revoked/)).toBeVisible();

    const guest2 = await browser.newPage();
    await guest2.goto(shareUrl);
    await expect(guest2.getByRole("alert")).toContainText(/isn't available/i);
    await guest2.close();
  });

  test("emergency card saves to the profile", async () => {
    await openApp(page, "sharing");
    await page.getByRole("tab", { name: /Emergency card/i }).click();
    await page.getByLabel("Blood type").fill("O+");
    await page.getByLabel("Emergency contact", { exact: true }).fill("Sam Tester");
    await page.getByRole("button", { name: /^Save$/ }).click();
    await expect(page.getByText("Emergency card saved.")).toBeVisible();
    await expect(page.getByTestId("emergency-card")).toContainText("O+");
  });

  test("settings: a reminder becomes due and appears in the bell menu", async () => {
    test.setTimeout(180_000);
    await openApp(page, "settings");
    await page.getByLabel(/Remind me to/i).fill("Book the annual blood test");
    // due in ~1 minute: the app asks the server to process due reminders every minute while open
    const soon = new Date(Date.now() + 70_000);
    await page.getByLabel("Date").fill(iso(soon));
    await page.getByLabel("Time").fill(`${pad(soon.getHours())}:${pad(soon.getMinutes())}`);
    await page.getByRole("button", { name: /^Add$/ }).click();
    await expect(page.getByText("Reminder added.")).toBeVisible();
    await expect(page.getByText("Book the annual blood test")).toBeVisible();

    await expect(page.getByRole("button", { name: /Notifications, \d+ unread/ })).toBeVisible({ timeout: 150_000 });
    await page.getByRole("button", { name: /Notifications, \d+ unread/ }).click();
    await expect(page.getByRole("dialog", { name: "Notifications" })).toContainText("Book the annual blood test");
    await page.getByRole("button", { name: /Seen/ }).click();
    await expect(page.getByRole("button", { name: "Notifications" })).toBeVisible();
  });

  test("global search finds a result by test name", async () => {
    await openApp(page, "dashboard");
    await page.getByRole("combobox", { name: /Search records/i }).fill("glucose");
    await expect(page.getByRole("listbox")).toContainText(/glucose/i, { timeout: 10_000 });
  });

  test("privacy: export downloads JSON; wrong password cannot delete; correct one does", async () => {
    await openApp(page, "privacy");
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: /Export my data/i }).click(),
    ]);
    expect(download.suggestedFilename()).toBe("healthmate-export.json");

    await page.getByRole("button", { name: /^Delete account$/i }).click();
    const d = page.getByRole("dialog");
    await d.getByLabel(/Type DELETE/i).fill("DELETE");
    await d.getByLabel(/Your password/i).fill("Wrong#Pass999");
    await d.getByRole("button", { name: /Delete everything/i }).click();
    await expect(d.getByRole("alert")).toContainText(/Incorrect password/i);

    await d.getByLabel(/Your password/i).fill(PASSWORD);
    await d.getByRole("button", { name: /Delete everything/i }).click();
    await expect(page).toHaveURL(/\/$/, { timeout: 15_000 });

    await page.goto("/login");
    await page.getByLabel(/Email Address/i).fill(EMAIL);
    await page.getByPlaceholder("••••••••••••").fill(PASSWORD);
    await page.getByRole("button", { name: /Sign In to Workspace/i }).click();
    await expect(page.getByRole("alert")).toContainText(/Invalid email address or password/i);
  });

  test("no unexpected console errors during the whole journey", async () => {
    expect(consoleErrors).toEqual([]);
  });
});
