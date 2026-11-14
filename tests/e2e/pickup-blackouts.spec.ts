import { test, expect } from "@playwright/test";
import { scheduleInput } from "../../src/lib/schedule-validation";
import { calendarDate, dateKey } from "../../src/lib/format";

test("server-provided Fridays remain selectable without client availability refreshes", async ({
  page,
  request,
}) => {
  const response = await request.get("/api/commerce/availability");
  expect(response.status()).toBe(200);
  const schedule = scheduleInput.parse(await response.json());
  if (!schedule.recurring)
    throw new Error("The storefront must use default-open Friday rules.");
  const availabilityRequests: string[] = [];
  page.on("request", (request) => {
    if (request.url().endsWith("/api/commerce/availability"))
      availabilityRequests.push(request.url());
  });
  // A browser availability failure must not override the server-provided schedule.
  await page.route("**/api/commerce/availability", (route) =>
    route.fulfill({ status: 503, json: { dates: [], availability: [] } }),
  );
  await page.clock.install();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const card = page.locator("article").filter({
    has: page.getByRole("link", {
      name: "View Classic Focaccia",
      exact: true,
    }),
  });
  await card.locator('input[type="radio"]:not([disabled])').first().check();
  await card.getByRole("button", { name: /Add to bag/ }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: /^Checkout/ }).click();
  const grid = dialog.getByRole("grid");
  await expect(grid).toBeVisible();
  const available = grid.locator("button:not([disabled])");
  await expect(available.first()).toBeVisible();
  // Navigation has no artificial last month or pre-created database-date limit.
  for (let index = 0; index < 6; index++)
    await dialog.getByRole("button", { name: /next month/i }).click();
  const dayLabels = await available.evaluateAll((buttons) =>
    buttons.map((button) => button.getAttribute("data-day")),
  );
  expect(dayLabels.length).toBeGreaterThan(0);
  for (const label of dayLabels) expect(new Date(label ?? "").getDay()).toBe(5);
  const day = dateKey(new Date(dayLabels[0] ?? ""));
  const selectedButton = grid.locator(
    `button[data-day="${calendarDate(day).toLocaleDateString("en-US")}"]`,
  );
  await selectedButton.click();
  await expect(
    dialog.getByRole("status").filter({ hasText: /^Selected / }),
  ).toBeVisible();

  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await page.clock.fastForward(16_000);
  await expect(selectedButton).toBeEnabled();
  await expect(
    dialog.getByRole("status").filter({ hasText: /^Selected / }),
  ).toBeVisible();

  // Checkout errors stay visible without a follow-up availability request.
  await page.route("**/api/commerce/checkout", (route) =>
    route.fulfill({
      status: 409,
      json: { code: "unavailable", error: "This Friday is unavailable." },
    }),
  );
  await dialog
    .getByRole("button", { name: "Continue to Stripe", exact: true })
    .click();
  await expect(dialog.getByRole("alert")).toHaveText(
    "This Friday is unavailable.",
  );
  await expect(
    dialog.getByRole("button", { name: "Continue to Stripe", exact: true }),
  ).toBeEnabled();
  expect(availabilityRequests).toEqual([]);
});
