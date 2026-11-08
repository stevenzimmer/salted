import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";
import { withDatabase, type Database } from "../../src/db/client";
import {
  marketingSubscriptions,
  orders,
  pickupDates,
} from "../../src/db/schema";
import { recordPaidMarketingConsent } from "../../src/marketing/preferences";
import { createUnsubscribeUrl } from "../../src/marketing/tokens";
import { hash } from "../../src/commerce/validation";

test.describe("unsubscribe with real Postgres preferences", () => {
  test.skip(
    process.env.UNSUBSCRIBE_QA !== "true",
    "Start the isolated unsubscribe QA server and set UNSUBSCRIBE_QA=true.",
  );
  const dbQA = <T>(fn: (db: Database) => Promise<T>) => {
    if (
      !process.env.TEST_DATABASE_URL ||
      process.env.TEST_DATABASE_URL === process.env.DATABASE_URL
    )
      throw new Error("A separate QA database is required.");
    return withDatabase(fn, process.env.TEST_DATABASE_URL);
  };
  const base = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3001";
  const emails: string[] = [],
    orderIds: string[] = [];
  let pickupId: string;
  const address = () => {
    const email = `unsubscribe-ui-${randomUUID()}@example.invalid`;
    emails.push(email);
    return email;
  };
  const current = (email: string) =>
    dbQA(
      async (db) =>
        (
          await db
            .select()
            .from(marketingSubscriptions)
            .where(eq(marketingSubscriptions.email, email))
        )[0],
    );
  async function paidSubscription() {
    const email = address(),
      id = randomUUID(),
      consentAt = new Date();
    orderIds.push(id);
    const text = "Send me newsletters. I can unsubscribe anytime.";
    await dbQA((db) =>
      db.transaction(async (tx) => {
        // Synthetic paid-order fixture only. The form/API and preference writes are real.
        await tx.insert(orders).values({
          id,
          orderNumber: `QA-UNSUB-${id}`,
          pickupDateId: pickupId,
          customerEmail: email,
          subtotalCents: 1200,
          totalCents: 1200,
          paymentStatus: "paid",
          orderStatus: "confirmed",
          ownerHash: hash(id),
          marketingOptIn: true,
          marketingConsentAt: consentAt,
          marketingConsentSource: "checkout_drawer",
          marketingConsentText: text,
          marketingConsentVersion: hash(text),
        });
        await recordPaidMarketingConsent(tx, { email, orderId: id, consentAt });
      }),
    );
    return { email, id, preference: await current(email) };
  }
  test.beforeAll(async () => {
    const friday = new Date("2097-12-01T12:00:00Z");
    while (friday.getUTCDay() !== 5) friday.setUTCDate(friday.getUTCDate() + 1);
    const [pickup] = await dbQA((db) =>
      db
        .insert(pickupDates)
        .values({
          date: friday.toISOString().slice(0, 10),
          startTime: "14:00",
          endTime: "18:00",
          cutoffAt: new Date("2097-11-01T00:00:00Z"),
          enabled: false,
          sanityMenuId: `qa-unsubscribe-ui-${randomUUID()}`,
          sanityRevision: randomUUID(),
        })
        .returning(),
    );
    pickupId = pickup.id;
  });
  test.afterAll(async () => {
    await dbQA(async (db) => {
      if (emails.length)
        await db
          .delete(marketingSubscriptions)
          .where(inArray(marketingSubscriptions.email, emails));
      if (orderIds.length)
        await db.delete(orders).where(inArray(orders.id, orderIds));
      if (pickupId)
        await db.delete(pickupDates).where(eq(pickupDates.id, pickupId));
    });
  });
  test("email form unsubscribes an actual preference, preserves history, and gives unknown/repeated addresses the same confirmation", async ({
    page,
  }) => {
    const fixture = await paidSubscription();
    await page.setViewportSize({ width: 390, height: 844 });
    for (const email of [fixture.email, address(), fixture.email]) {
      await page.goto("/unsubscribe");
      await expect(
        page.getByRole("heading", { name: "Unsubscribe", exact: true }),
      ).toBeVisible();
      await page
        .getByRole("textbox", { name: "Email address", exact: true })
        .fill(` ${email.toUpperCase()} `);
      const responsePromise = page.waitForResponse(
        (response) =>
          response.url().endsWith("/api/marketing/unsubscribe") &&
          response.request().method() === "POST",
      );
      await page
        .getByRole("button", { name: "Unsubscribe", exact: true })
        .click();
      const response = await responsePromise;
      expect(response.status()).toBe(200);
      expect(await response.json()).toEqual({ code: "unsubscribed" });
      await expect(page.getByRole("status")).toContainText(
        "Your preferences are saved.",
      );
      expect((await current(email)).subscribed).toBe(false);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true);
    }
    const [order] = await dbQA((db) =>
      db.select().from(orders).where(eq(orders.id, fixture.id)),
    );
    expect(order.marketingOptIn).toBe(true);
    expect(order.paymentStatus).toBe("paid");
    expect(order.marketingConsentAt?.getTime()).toBe(
      fixture.preference.lastConsentAt?.getTime(),
    );
  });
  test("a signed-link visit is read-only until confirmation and keeps the capability out of HTTP requests and analytics", async ({
    page,
  }) => {
    const fixture = await paidSubscription();
    const url = createUnsubscribeUrl(fixture.preference.id, base);
    const response = await page.goto(url);
    expect(response?.headers()["referrer-policy"]).toBe("no-referrer");
    expect(response?.headers()["x-robots-tag"]).toBe("noindex, nofollow");
    expect(response?.request().url()).not.toContain("token=");
    await expect(
      page.getByRole("button", { name: "Confirm unsubscribe", exact: true }),
    ).toBeVisible();
    expect((await current(fixture.email)).subscribed).toBe(true);
    expect(await page.locator('script[src*="googletagmanager"]').count()).toBe(
      0,
    );
    await page
      .getByRole("button", { name: "Confirm unsubscribe", exact: true })
      .click();
    await expect(page.getByRole("status")).toContainText(
      "Your preferences are saved.",
    );
    await expect(page).toHaveURL(`${base}/unsubscribe`);
    expect((await current(fixture.email)).subscribed).toBe(false);
    expect((await current(fixture.email)).unsubscribeSource).toBe(
      "signed_link",
    );
  });
  test("invalid links, invalid inputs, cross-site submissions and GETs cannot change a subscription", async ({
    page,
    request,
  }) => {
    const fixture = await paidSubscription();
    const url = new URL(createUnsubscribeUrl(fixture.preference.id, base));
    const token = new URLSearchParams(url.hash.slice(1)).get("token")!;
    const replacement = token.endsWith("A") ? "B" : "A";
    url.hash = new URLSearchParams({
      token: token.slice(0, -1) + replacement,
    }).toString();
    await page.goto(url.href);
    await page
      .getByRole("button", { name: "Confirm unsubscribe", exact: true })
      .click();
    await expect(page.locator("#unsubscribe-error")).toContainText(
      "This link is invalid.",
    );
    await expect(
      page.getByRole("textbox", { name: "Email address", exact: true }),
    ).toBeVisible();
    await page
      .getByRole("textbox", { name: "Email address", exact: true })
      .fill("invalid");
    await page
      .getByRole("button", { name: "Unsubscribe", exact: true })
      .click();
    await expect(page.locator("#unsubscribe-error")).toContainText(
      "Enter a valid email address.",
    );
    await expect(
      page.getByRole("textbox", { name: "Email address", exact: true }),
    ).toBeVisible();
    expect((await request.get("/api/marketing/unsubscribe")).status()).toBe(
      405,
    );
    expect(
      (
        await request.post("/api/marketing/unsubscribe", {
          headers: { origin: "https://other.example" },
          data: { method: "email", email: fixture.email },
        })
      ).status(),
    ).toBe(403);
    expect(
      (
        await request.post("/api/marketing/unsubscribe", {
          headers: { origin: base },
          data: { method: "email", email: fixture.email, subscribed: true },
        })
      ).status(),
    ).toBe(400);
    expect((await current(fixture.email)).subscribed).toBe(true);
    const [order] = await dbQA((db) =>
      db
        .select()
        .from(orders)
        .where(and(eq(orders.id, fixture.id), eq(orders.marketingOptIn, true))),
    );
    expect(order).toBeTruthy();
    await page
      .getByRole("textbox", { name: "Email address", exact: true })
      .fill(fixture.email);
    await page
      .getByRole("button", { name: "Unsubscribe", exact: true })
      .click();
    await expect(page.getByRole("status")).toContainText(
      "Your preferences are saved.",
    );
    expect((await current(fixture.email)).subscribed).toBe(false);
  });
});
