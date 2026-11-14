import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { withDatabase } from "../../src/db/client";
import {
  marketingSubscriptions,
  specialOrderRequests,
} from "../../src/db/schema";
import { unsubscribeEmail } from "../../src/marketing/preferences";
import type { SpecialOrderSubmission } from "../../src/lib/special-orders";

test.skip(
  process.env.SPECIAL_ORDERS_QA !== "true",
  "Use the isolated special-orders:qa server; sending is disabled there.",
);
const qa = process.env.TEST_DATABASE_URL;
const app = process.env.DATABASE_URL;
test.beforeAll(() => {
  if (
    !qa ||
    !app ||
    new URL(qa).hostname.replace("-pooler.", ".") ===
      new URL(app).hostname.replace("-pooler.", ".")
  )
    throw new Error("An isolated QA branch is required.");
});

for (const optedIn of [false, true]) {
  test(`special-order UI saves ${optedIn ? "affirmative consent" : "unchecked requests and lost-response retries"} in Postgres`, async ({
    page,
    baseURL,
  }) => {
    const email = `special-ui-${randomUUID()}@example.com`;
    const captured: SpecialOrderSubmission[] = [];
    try {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto("/special-orders");
      const form = page.locator(".special-order-form");
      const checkbox = form.getByRole("checkbox");
      await expect(checkbox).not.toBeChecked();
      await expect(form.locator("textarea")).toHaveCount(1);
      await expect(
        form.locator('[name="quantity"], [name="eventType"], [name="notes"]'),
      ).toHaveCount(0);
      await form.locator('[name="name"]').fill("QA Customer");
      await form.locator('[name="email"]').fill(email);
      await form.locator('[name="phone"]').fill("9165550100");
      const date = form.locator('[name="date"]');
      await date.fill((await date.getAttribute("min"))!);
      await form
        .locator('[name="products"]')
        .fill("Four pans for a birthday dinner. Please slice for sharing.");
      if (optedIn) {
        await checkbox.focus();
        await page.keyboard.press("Space");
        await expect(checkbox).toBeChecked();
      }
      await page.route("**/api/special-orders", async (route) => {
        captured.push(route.request().postDataJSON());
        if (!optedIn && captured.length === 1) {
          const response = await route.fetch();
          expect(response.status()).toBe(200);
          expect(await response.json()).toEqual({ code: "submitted" });
          await route.abort("failed");
        } else await route.continue();
      });
      await form.getByRole("button", { name: "Send my request" }).click();
      if (!optedIn) {
        await expect(form.locator('[role="alert"]')).toBeVisible();
        await form.getByRole("button", { name: "Send my request" }).click();
        await expect.poll(() => captured.length).toBe(2);
        expect(captured[0].requestKey).toBe(captured[1].requestKey);
      }
      await expect(page.locator(".special-success")).toBeVisible();
      const rows = await withDatabase(
        (db) =>
          db
            .select()
            .from(specialOrderRequests)
            .where(eq(specialOrderRequests.email, email)),
        qa,
      );
      expect(rows).toHaveLength(1);
      expect(rows[0].products).toContain("birthday dinner");
      expect(rows[0].marketingOptIn).toBe(optedIn);
      expect(rows[0].notificationStatus).toBe("pending");
      expect(rows[0].firstAttemptAt).toBeNull();
      const subscriptions = await withDatabase(
        (db) =>
          db
            .select()
            .from(marketingSubscriptions)
            .where(eq(marketingSubscriptions.email, email)),
        qa,
      );
      if (optedIn) {
        expect(rows[0].marketingConsentText).toBe(
          captured[0].marketingConsentText,
        );
        expect(rows[0].marketingConsentSource).toBe("special_order_form");
        expect(subscriptions[0].subscribed).toBe(true);
        expect(subscriptions[0].lastConsentSpecialOrderId).toBe(rows[0].id);
        await withDatabase((db) => unsubscribeEmail(db, email), qa);
        await page.unroute("**/api/special-orders");
        const retry = await page.request.post("/api/special-orders", {
          headers: { origin: baseURL! },
          data: captured[0],
        });
        expect(retry.status()).toBe(200);
        const [withdrawn] = await withDatabase(
          (db) =>
            db
              .select()
              .from(marketingSubscriptions)
              .where(eq(marketingSubscriptions.email, email)),
          qa,
        );
        expect(withdrawn.subscribed).toBe(false);
      } else {
        expect(rows[0].marketingConsentAt).toBeNull();
        expect(subscriptions).toHaveLength(0);
      }
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true);
    } finally {
      await withDatabase(async (db) => {
        await db
          .delete(marketingSubscriptions)
          .where(eq(marketingSubscriptions.email, email));
        await db
          .delete(specialOrderRequests)
          .where(eq(specialOrderRequests.email, email));
      }, qa);
    }
  });
}

test("special-order API rejects unsafe origins, oversized/invalid input and stale consent without saving requests", async ({
  request,
  baseURL,
}) => {
  const email = `special-api-${randomUUID()}@example.com`;
  const input = {
    requestKey: randomUUID(),
    name: "QA Customer",
    email,
    phone: "9165550100",
    date: "2099-01-01",
    products: "Two focaccia pans for a dinner.",
  };
  expect((await request.get("/api/special-orders")).status()).toBe(405);
  expect(
    (
      await request.post("/api/special-orders", {
        headers: { origin: "https://other.example" },
        data: input,
      })
    ).status(),
  ).toBe(403);
  expect(
    (
      await request.post("/api/special-orders", {
        headers: { origin: baseURL! },
        data: { ...input, products: "x".repeat(21_000) },
      })
    ).status(),
  ).toBe(400);
  expect(
    (
      await request.post("/api/special-orders", {
        headers: { origin: baseURL! },
        data: { ...input, date: "2099-02-30" },
      })
    ).status(),
  ).toBe(400);
  expect(
    (
      await request.post("/api/special-orders", {
        headers: { origin: baseURL! },
        data: {
          ...input,
          marketingOptIn: true,
          marketingConsentText: "Old wording",
        },
      })
    ).status(),
  ).toBe(409);
  const rows = await withDatabase(
    (db) =>
      db
        .select()
        .from(specialOrderRequests)
        .where(eq(specialOrderRequests.email, email)),
    qa,
  );
  expect(rows).toHaveLength(0);
});
