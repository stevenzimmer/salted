import { test, expect, type Page } from "@playwright/test";
import { minimumSpecialOrderDate } from "../../src/lib/special-orders";

async function formEvents(page: Page) {
  return page.evaluate(() => {
    const browser = window as Window & { dataLayer?: unknown[] };
    return (browser.dataLayer ?? [])
      .map((entry) => Array.from(entry as IArguments))
      .filter(
        (entry) =>
          entry[0] === "event" &&
          typeof entry[1] === "string" &&
          entry[1].startsWith("special_order_form_"),
      );
  });
}

test("special-order analytics tracks edits and confirmed success once, including failed retries and restart", async ({
  page,
}) => {
  // Never send test events to GA or create real special-order requests.
  await page.route(
    /https:\/\/[^/]*(googletagmanager|google-analytics)\.com\//,
    (route) => route.abort(),
  );
  let fail = true;
  let submissions = 0;
  await page.route("**/api/special-orders", async (route) => {
    submissions += 1;
    await route.fulfill({
      status: fail ? 500 : 200,
      json: { code: fail ? "submit_error" : "submitted" },
    });
  });
  await page.goto("/special-orders");
  const form = page.locator(".special-order-form");
  await expect(form).toBeVisible();
  await form.locator('[name="name"]').focus();
  expect(await formEvents(page)).toEqual([]);
  await form.locator('[name="name"]').fill("Analytics Test");
  await form.locator('[name="email"]').fill("analytics@example.com");
  const start = [
    "event",
    "special_order_form_start",
    { form_id: "special_order" },
  ];
  const finish = [
    "event",
    "special_order_form_submit",
    { form_id: "special_order" },
  ];
  expect(await formEvents(page)).toEqual([start]);
  const submit = form.locator('button[type="submit"]');
  await submit.click();
  expect(submissions).toBe(0);
  expect(await formEvents(page)).toEqual([start]);
  await form.locator('[name="phone"]').fill("4155550123");
  await form.locator('[name="date"]').fill(minimumSpecialOrderDate());
  await form
    .locator('[name="products"]')
    .fill("Six focaccia for a birthday dinner");
  await submit.click();
  await expect(form.locator('[role="alert"]')).toBeVisible();
  expect(submissions).toBe(1);
  expect(await formEvents(page)).toEqual([start]);
  fail = false;
  await submit.click();
  await expect(page.locator(".special-success")).toBeVisible();
  expect(submissions).toBe(2);
  expect(await formEvents(page)).toEqual([start, finish]);
  await page.locator(".special-success button").click();
  expect(await formEvents(page)).toEqual([start, finish]);
  await form.locator('[name="name"]').fill("Another Request");
  expect(await formEvents(page)).toEqual([start, finish, start]);
});
