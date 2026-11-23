import { test, expect, type Page } from "@playwright/test";

async function filterEvents(page: Page) {
  return page.evaluate(() => {
    const browser = window as Window & { dataLayer?: unknown[] };
    return (browser.dataLayer ?? [])
      .map((entry) => Array.from(entry as IArguments))
      .filter(
        (entry) => entry[0] === "event" && entry[1] === "product_filter_select",
      );
  });
}

test("filter changes track once with displayed result count, including keyboard activation", async ({
  page,
}) => {
  await page.route(
    /https:\/\/[^/]*(googletagmanager|google-analytics)\.com\//,
    (route) => route.abort(),
  );
  await page.goto("/");
  const filters = page.locator(".product-filters button");
  await expect(filters.first()).toBeVisible();
  expect(await filters.count()).toBeGreaterThan(1);
  expect(await filterEvents(page)).toEqual([]);
  await filters.first().click();
  expect(await filterEvents(page)).toEqual([]);
  await filters.nth(1).focus();
  await page.keyboard.press("Enter");
  await expect(filters.nth(1)).toHaveAttribute("aria-pressed", "true");
  let events = await filterEvents(page);
  expect(events).toHaveLength(1);
  expect(events[0][2]).toEqual({
    filter_id: expect.any(String),
    filter_label: (await filters.nth(1).textContent())?.trim(),
    category_id: expect.any(String),
    show_all: expect.any(Boolean),
    result_count: await page.locator(".product-grid > div").count(),
  });
  await filters.nth(1).click();
  expect(await filterEvents(page)).toEqual(events);
  await filters.first().click();
  events = await filterEvents(page);
  expect(events).toHaveLength(2);
  expect(events[1][2]).toMatchObject({
    filter_label: (await filters.first().textContent())?.trim(),
    result_count: await page.locator(".product-grid > div").count(),
  });
});
