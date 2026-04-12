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

test("shows 4 calendar entries for April (days with hours badges)", async ({
  page,
}) => {
  const badges = page.locator(".hours-badge");
  await expect(badges).toHaveCount(4);
});

test("chips show correct totals", async ({ page }) => {
  const totals = page.locator("#totals");
  await expect(totals).toContainText("בוצע: 4 שע׳");
  await expect(totals).toContainText("מאושר: 8 שע׳");
  await expect(totals).toContainText("סה״כ: 12 שע׳");
});

test("can navigate to May with arrow button", async ({ page }) => {
  // RTL layout: "next" button (←) goes forward
  await page.click("#next");
  const label = page.locator("#monthLabel");
  await expect(label).toHaveText("מאי 2026");
});

test("May shows TBD entries for Neve Yaakov Mondays", async ({ page }) => {
  await page.click("#next");
  const tbdCells = page.locator(".day.status-tbd");
  await expect(tbdCells).toHaveCount(4);
});

test("hovering a TBD entry shows tooltip with deadline text", async ({
  page,
}) => {
  await page.click("#next");
  const tbdCell = page.locator(".day.status-tbd").first();
  const tooltip = tbdCell.locator(".tooltip");
  // Tooltip should contain deadline text
  await expect(tooltip).toContainText("להחליט עד");
});

test("detail cards show below calendar with correct info", async ({ page }) => {
  const details = page.locator("#details");
  await expect(details).toContainText("פירוט החודש");
  const cards = page.locator(".detail-card");
  await expect(cards).toHaveCount(4);
});

test("today (April 12) has the today class", async ({ page }) => {
  const todayCell = page.locator(".day.today");
  await expect(todayCell).toHaveCount(1);
  await expect(todayCell.locator(".num")).toHaveText("12");
});
