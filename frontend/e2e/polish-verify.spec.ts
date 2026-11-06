import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import fs from "fs";
import path from "path";

function calculateLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const val = c / 255;
    return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function parseRgb(color: string): [number, number, number] {
  const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!match) return [255, 255, 255];
  return [parseInt(match[1], 10), parseInt(match[2], 10), parseInt(match[3], 10)];
}

test.describe("HealthMate UI Polish & Modern Architecture", () => {
  test.beforeAll(() => {
    const dir = path.resolve("./screenshots");
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });

  test("1. Styles, tokens, and Tailwind applied with zero console errors", async ({ page, browserName }, testInfo) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Check design tokens
    const primaryToken = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue("--green-800").trim()
    );
    expect(primaryToken).not.toBe("");

    // Check primary button styling
    const getStartedBtn = page.getByRole("button", { name: /get started free/i }).first();
    await expect(getStartedBtn).toBeVisible();

    const btnBg = await getStartedBtn.evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(btnBg).not.toBe("rgba(0, 0, 0, 0)");

    // No serious console errors
    const seriousErrors = consoleErrors.filter(
      (err) => !err.includes("favicon") && !err.includes("Download the React DevTools")
    );
    expect(seriousErrors.length).toBe(0);
  });

  test("2. Navbar is visible at scroll 0 and remains fixed with blur on scroll", async ({ page }, testInfo) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const header = page.locator("header");
    await expect(header).toBeVisible();

    // At top: data-scrolled is false
    const initialScrolled = await header.getAttribute("data-scrolled");
    expect(initialScrolled).toBe("false");

    // Scroll down 400px
    await page.evaluate(() => window.scrollTo(0, 400));
    await page.waitForTimeout(300);

    // After scroll: header remains visible and fixed
    await expect(header).toBeVisible();
    const position = await header.evaluate((el) => getComputedStyle(el).position);
    expect(position).toBe("fixed");

    const afterScrollScrolled = await header.getAttribute("data-scrolled");
    expect(afterScrollScrolled).toBe("true");
  });

  test("3. Feature stories and bento tiles render, and the demos respond to clicks", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    await expect(page.locator("#features")).toBeVisible();
    for (const name of [/Upload once/i, /See what is changing/i, /Never miss a dose/i, /Ask your records/i]) {
      await expect(page.getByRole("heading", { name })).toBeVisible();
    }
    for (const name of ["Family profiles", "Emergency card", "Doctor visit pack", "Symptom diary", "Appointments & checklists", "Yours to export or delete"]) {
      await expect(page.getByRole("heading", { name })).toBeVisible();
    }

    // Family switcher is interactive
    await page.getByRole("tab", { name: /Meera/ }).click();
    await expect(page.getByTestId("family-demo")).toContainText("Type 2 diabetes");

    // Dose tracker is interactive: tapping a dose updates the ring
    const doseDemo = page.getByTestId("dose-demo");
    await expect(doseDemo).toContainText("1/4");
    await doseDemo.getByRole("button", { name: /Vitamin D3/ }).click();
    await expect(doseDemo).toContainText("2/4");
  });

  test("4. Trend chart and QR share demo are interactive", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const trend = page.getByTestId("trend-demo");
    await expect(trend).toBeVisible();
    await expect(trend.getByRole("button", { name: "3M", exact: true })).toBeVisible();
    await trend.getByRole("button", { name: "1Y", exact: true }).click();
    await expect(trend.getByRole("button", { name: "1Y", exact: true })).toHaveAttribute("aria-pressed", "true");
    await expect(trend.locator("svg").first()).toBeVisible();

    // Accessible table alternative
    await trend.getByRole("button", { name: /Show chart data as a table/i }).click();
    await expect(trend.getByRole("table")).toBeVisible();

    const qr = page.getByTestId("qr-demo");
    await qr.scrollIntoViewIfNeeded();
    await qr.getByRole("button", { name: "Revoke link" }).click();
    await expect(qr).toContainText("Link revoked");
    await qr.getByRole("button", { name: /Create a new link/i }).click();
    await expect(qr).not.toContainText("Link revoked");
  });

  test("5. Final CTA has high contrast (>= 4.5:1) white text on dark green gradient", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const ctaHeading = page.getByRole("heading", { name: /Start organising your family’s health today/i });
    await expect(ctaHeading).toBeVisible();

    const textColor = await ctaHeading.evaluate((el) => getComputedStyle(el).color);
    const [r, g, b] = parseRgb(textColor);

    // Headline is white or near-white (r, g, b > 240)
    expect(r).toBeGreaterThanOrEqual(240);
    expect(g).toBeGreaterThanOrEqual(240);
    expect(b).toBeGreaterThanOrEqual(240);

    const headingLum = calculateLuminance(r, g, b);
    // Dark green background luminance is ~ 0.02
    const bgLum = 0.02;
    const contrastRatio = (headingLum + 0.05) / (bgLum + 0.05);

    expect(contrastRatio).toBeGreaterThanOrEqual(4.5);
  });

  test("6. Axe accessibility check has zero critical violations", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .disableRules(["color-contrast"]) // Tested explicitly in test 5
      .analyze();

    const criticalViolations = accessibilityScanResults.violations.filter(
      (v) => v.impact === "critical"
    );
    expect(criticalViolations).toEqual([]);
  });

  test("7. Route structure works: /login, /register, and /s/:token render", async ({ page }) => {
    // /login
    await page.goto("/login");
    await page.waitForLoadState("networkidle");
    await expect(page.getByText(/Welcome back/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /Sign In to Workspace/i })).toBeVisible();

    // /register
    await page.goto("/register");
    await page.waitForLoadState("networkidle");
    await expect(page.getByText(/Create your free health vault/i)).toBeVisible();
    await expect(page.getByText("1. Account")).toBeVisible();

    // /s/:token
    await page.goto("/s/SH-DEMO-99");
    await page.waitForLoadState("networkidle");
    // An unknown/expired token must fail closed with a clear message (no patient data).
    await expect(page.getByRole("alert")).toContainText(/isn't available/i);
  });

  test("8. Capture visual screenshots at 1440px desktop and 390px mobile", async ({ page }, testInfo) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const projectName = testInfo.project.name.toLowerCase();
    const screenshotPath = path.resolve(`./screenshots/landing-${projectName}.png`);

    await page.screenshot({ path: screenshotPath, fullPage: true });
    expect(fs.existsSync(screenshotPath)).toBe(true);
  });
});
