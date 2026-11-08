import { test, expect } from "@playwright/test";
import { eq, inArray, and } from "drizzle-orm";
import { withDatabase, type Database } from "../../src/db/client";
import {
  orders,
  orderItems,
  checkoutAttempts,
  inventory,
  reservations,
  processedStripeEvents,
} from "../../src/db/schema";
import { stripeClient } from "../../src/commerce/config";
import { createOrRecoverSession } from "../../src/commerce/checkout";
import { applySession } from "../../src/commerce/store";
import { checkoutInput } from "../../src/commerce/validation";
test.describe("default Friday menu with real sandbox payments", () => {
  test.skip(
    process.env.MANUAL_MENU_QA !== "true",
    "Run against the isolated commerce test server and actual Stripe CLI forwarding.",
  );
  const dbQA = <T>(fn: (db: Database) => Promise<T>) => {
    if (
      !process.env.TEST_DATABASE_URL ||
      process.env.TEST_DATABASE_URL === process.env.DATABASE_URL
    )
      throw new Error("Use a separate QA database.");
    return withDatabase(fn, process.env.TEST_DATABASE_URL);
  };
  const attemptIds: string[] = [];
  test.afterAll(async () => {
    if (!attemptIds.length) return;
    const attempts = await dbQA((db) =>
      db
        .select({ attempt: checkoutAttempts })
        .from(checkoutAttempts)
        .where(
          and(
            inArray(checkoutAttempts.id, attemptIds),
            inArray(checkoutAttempts.status, ["creating", "open"]),
          ),
        ),
    );
    for (const { attempt } of attempts) {
      const session = await createOrRecoverSession(attempt, { database: dbQA });
      const final =
        session.status === "open"
          ? await stripeClient().checkout.sessions.expire(session.id)
          : session;
      await dbQA((db) => applySession(db, final));
    }
    // Keep real sandbox paid orders and their date references for audit.
  });
  test("active size accepts 20 units without stock rows, pays, receives a real webhook and confirms", async ({
    page,
    request,
  }) => {
    const response = await request.get("/api/commerce/availability");
    expect(response.status()).toBe(200);
    const schedule = await response.json();
    expect(schedule.recurring.offerings.length).toBeGreaterThan(0);
    await page.goto("/");
    const card = page.locator("article").filter({
      has: page.getByRole("link", {
        name: "View Classic Focaccia",
        exact: true,
      }),
    });
    await card.getByRole("radio", { name: '8" × 8"', exact: true }).check();
    const increase = card.getByRole("button", {
      name: /Increase quantity for/,
    });
    for (let i = 1; i < 20; i++) await increase.click();
    await expect(increase).toBeDisabled();
    await card.getByRole("button", { name: /Add to bag/ }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("button", { name: /^Checkout/ }).click();
    const firstFriday = dialog
      .getByRole("grid")
      .locator("button:not([disabled])")
      .first();
    await firstFriday.click();
    const checkoutRequest = page.waitForRequest(
      (request) =>
        request.method() === "POST" &&
        request.url().endsWith("/api/commerce/checkout"),
    );
    await dialog
      .getByRole("button", { name: "Continue to Stripe", exact: true })
      .click();
    attemptIds.push(
      checkoutInput.parse((await checkoutRequest).postDataJSON()).requestKey,
    );
    await expect(page).toHaveURL(/^https:\/\/checkout\.stripe\.com\//, {
      timeout: 45000,
    });
    await page
      .getByRole("textbox", { name: "email@example.com", exact: true })
      .fill("manual-menu-qa@example.invalid");
    await page
      .getByRole("textbox", { name: "Full name", exact: true })
      .fill("Synthetic Manual Menu QA");
    await page
      .getByRole("textbox", { name: "Card number", exact: true })
      .fill("4242424242424242");
    await page
      .getByRole("textbox", { name: "Expiration", exact: true })
      .fill("1230");
    await page
      .getByRole("textbox", {
        name: "Credit or debit card CVC/CVV",
        exact: true,
      })
      .fill("123");
    await page
      .getByRole("textbox", { name: "Cardholder name", exact: true })
      .fill("Synthetic Manual Menu QA");
    await page.getByRole("textbox", { name: "ZIP", exact: true }).fill("95677");
    await page.getByRole("button", { name: "Pay", exact: true }).click();
    await expect(page).toHaveURL(/\/order\/success\?session_id=cs_test_/, {
      timeout: 60000,
    });
    await expect(
      page.getByRole("heading", {
        name: "Your order is confirmed",
        exact: true,
      }),
    ).toBeVisible({ timeout: 30000 });
    const sessionId = new URL(page.url()).searchParams.get("session_id");
    if (!sessionId) throw new Error("Missing test Session ID.");
    const [record] = await dbQA((db) =>
      db
        .select({ order: orders, attempt: checkoutAttempts })
        .from(orders)
        .innerJoin(checkoutAttempts, eq(checkoutAttempts.orderId, orders.id))
        .where(eq(orders.stripeCheckoutSessionId, sessionId)),
    );
    expect(record.order.paymentStatus).toBe("paid");
    expect(record.attempt.inventoryMode).toBe("uncapped");
    const items = await dbQA((db) =>
      db
        .select()
        .from(orderItems)
        .where(eq(orderItems.orderId, record.order.id)),
    );
    expect(items[0].quantity).toBe(20);
    expect(record.order.totalCents).toBe(items[0].unitPriceCents * 20);
    expect(
      (
        await dbQA((db) =>
          db
            .select()
            .from(inventory)
            .where(eq(inventory.pickupDateId, record.order.pickupDateId)),
        )
      ).length,
    ).toBe(0);
    expect(
      (
        await dbQA((db) =>
          db
            .select()
            .from(reservations)
            .where(eq(reservations.checkoutAttemptId, record.attempt.id)),
        )
      ).length,
    ).toBe(0);
    const events = await stripeClient().events.list({
      type: "checkout.session.completed",
      limit: 30,
    });
    const event = events.data.find(
      (event) =>
        event.data.object.object === "checkout.session" &&
        event.data.object.id === sessionId,
    );
    expect(event).toBeTruthy();
    if (!event) throw new Error("Missing actual Checkout completion event.");
    await expect
      .poll(
        async () =>
          (
            await dbQA((db) =>
              db
                .select()
                .from(processedStripeEvents)
                .where(eq(processedStripeEvents.stripeEventId, event.id)),
            )
          ).length,
        { timeout: 20000 },
      )
      .toBe(1);
    await expect(
      page.getByRole("button", { name: "Open cart, 0 items", exact: true }),
    ).toBeVisible();
    await expect(page.getByText(/2–6pm PT/)).toBeVisible();
  });
});
