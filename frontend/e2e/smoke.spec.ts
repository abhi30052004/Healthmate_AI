import { test, expect } from "@playwright/test";

test("styles are applied", async ({ page }) => {
  await page.goto("/");
  const token = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue("--green-800").trim()
  );
  expect(token).not.toBe("");
  const btn = page.getByRole("button", { name: /get started/i }).first();
  const bg = await btn.evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(bg).not.toBe("rgba(0, 0, 0, 0)");
});

