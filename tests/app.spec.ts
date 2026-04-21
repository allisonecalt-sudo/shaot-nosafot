import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test("page loads with correct title", async ({ page }) => {
  await expect(page).toHaveTitle("שעות נוספות");
});

test("April 2026 shows by default with correct month label", async ({
  page,
}) => {
  const label = page.locator("#monthLabel");
  await expect(label).toHaveText("אפריל 2026");
});

test("shows manual entries plus auto-generated TBD entries for April", async ({
  page,
}) => {
  // 4 manual entries + TBD auto-generated for Mondays/Fridays without manual entries
  const badges = page.locator(".hours-badge");
  const count = await badges.count();
  expect(count).toBeGreaterThanOrEqual(4);
});

test("chips show correct totals for manual entries", async ({ page }) => {
  const totals = page.locator("#totals");
  await expect(totals).toContainText("בוצע: 6 שע׳");
  await expect(totals).toContainText("מאושר: 12 שע׳");
});

test("can navigate to May with arrow button", async ({ page }) => {
  await page.click("#next");
  const label = page.locator("#monthLabel");
  await expect(label).toHaveText("מאי 2026");
});

test("May shows TBD entries for Fridays", async ({ page }) => {
  await page.click("#next");
  const tbdCells = page.locator(".day.status-tbd");
  const count = await tbdCells.count();
  // Fridays without manual entries (May 1 and 8 are manual, so remaining Fridays)
  expect(count).toBeGreaterThanOrEqual(2);
});

test("hovering a TBD entry shows tooltip with notice period", async ({
  page,
}) => {
  await page.click("#next");
  const tbdCell = page.locator(".day.status-tbd").first();
  const tooltip = tbdCell.locator(".tooltip");
  await expect(tooltip).toContainText("להחליט עד");
});

test("detail cards show below calendar", async ({ page }) => {
  const details = page.locator("#details");
  await expect(details).toContainText("פירוט החודש");
  const cards = page.locator(".detail-card");
  const count = await cards.count();
  expect(count).toBeGreaterThanOrEqual(4);
});

test("today has the today class", async ({ page }) => {
  const todayCell = page.locator(".day.today");
  await expect(todayCell).toHaveCount(1);
  const today = new Date().getDate().toString();
  await expect(todayCell.locator(".num")).toHaveText(today);
});

test("TBD entries show notice period in tooltip", async ({ page }) => {
  await page.click("#next");
  const tbdCells = page.locator(".day.status-tbd");
  const count = await tbdCells.count();
  expect(count).toBeGreaterThan(0);
  const tooltip = tbdCells.first().locator(".tooltip");
  await expect(tooltip).toContainText("להחליט עד");
});

test("auto-generated TBD entries are replaced by manual entries", async ({
  page,
}) => {
  // Apr 10 (Friday) has a manual "done" entry, should not also show as TBD
  const apr10 = page.locator(".day.status-done .num", { hasText: "10" });
  await expect(apr10).toHaveCount(1);
  const apr10tbd = page.locator(".day.status-tbd .num", { hasText: "10" });
  await expect(apr10tbd).toHaveCount(0);
});
