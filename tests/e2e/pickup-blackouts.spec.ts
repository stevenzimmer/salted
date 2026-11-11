import { test, expect } from "@playwright/test";
import { scheduleInput } from "../../src/lib/schedule-validation";
import { calendarDate, dateKey } from "../../src/lib/format";

test("default Fridays remain selectable across months; blackout refreshes remove selection and clearing reopens it", async ({
  page,
  request,
}) => {
  const response = await request.get("/api/commerce/availability");
  expect(response.status()).toBe(200);
  const schedule = scheduleInput.parse(await response.json());
  if (!schedule.recurring)
    throw new Error("The storefront must use default-open Friday rules.");
  let blackoutDates = schedule.recurring.blackoutDates;
  let unavailable = false;
  await page.route("**/api/commerce/availability", (route) =>
    route.fulfill({
      status: unavailable ? 503 : 200,
      json: unavailable
        ? { dates: [], availability: [] }
        : {
            ...schedule,
            recurring: { ...schedule.recurring, blackoutDates },
          },
    }),
  );
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

  blackoutDates = [...blackoutDates, day];
  let refreshed = page.waitForResponse((r) =>
    r.url().endsWith("/api/commerce/availability"),
  );
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await refreshed;
  await expect(selectedButton).toBeDisabled();
  await expect(
    dialog.getByRole("status").filter({ hasText: /^Selected / }),
  ).toHaveCount(0);
  await expect(
    dialog.getByRole("button", { name: "Continue to Stripe", exact: true }),
  ).toHaveCount(0);
  await expect(available.first()).toBeVisible();

  blackoutDates = blackoutDates.filter((date) => date !== day);
  refreshed = page.waitForResponse((r) =>
    r.url().endsWith("/api/commerce/availability"),
  );
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await refreshed;
  await expect(selectedButton).toBeEnabled();

  unavailable = true;
  refreshed = page.waitForResponse((r) =>
    r.url().endsWith("/api/commerce/availability"),
  );
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await refreshed;
  await expect(grid).toBeVisible();
  await expect(available).toHaveCount(0);
});
