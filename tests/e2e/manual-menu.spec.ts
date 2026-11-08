import { test, expect } from "@playwright/test";
import { eq, inArray, and } from "drizzle-orm";
import { withDatabase, type Database } from "../../src/db/client";
import {
  pickupDates,
  orders,
  orderItems,
  checkoutAttempts,
  inventory,
  reservations,
  processedStripeEvents,
} from "../../src/db/schema";
import { openPickupDate, closePickupDate } from "../../src/commerce/pickups";
import { stripeClient } from "../../src/commerce/config";
import { createOrRecoverSession } from "../../src/commerce/checkout";
import { applySession } from "../../src/commerce/store";
import { fetchCatalog } from "../../src/commerce/catalog";
test.describe("manual menu with real sandbox payments", () => {
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
  const days: string[] = [];
  test.beforeAll(async () => {
    const day = new Date();
    day.setUTCDate(day.getUTCDate() + 8);
    while (day.getUTCDay() !== 5) day.setUTCDate(day.getUTCDate() + 1);
    // Explicit temporary QA dates only; preserve any pre-existing operator dates.
    for (let i = 0; i < 2; i++) {
      while (
        (
          await dbQA((db) =>
            db
              .select()
              .from(pickupDates)
              .where(eq(pickupDates.date, day.toISOString().slice(0, 10))),
          )
        ).length
      )
        day.setUTCDate(day.getUTCDate() + 7);
      const date = day.toISOString().slice(0, 10);
      await dbQA((db) => openPickupDate(db, date));
      days.push(date);
      day.setUTCDate(day.getUTCDate() + 7);
    }
  });
  test.afterAll(async () => {
    if (!days.length) return;
    const attempts = await dbQA((db) =>
      db
        .select({ attempt: checkoutAttempts })
        .from(checkoutAttempts)
        .innerJoin(orders, eq(checkoutAttempts.orderId, orders.id))
        .innerJoin(pickupDates, eq(orders.pickupDateId, pickupDates.id))
        .where(
          and(
            inArray(pickupDates.date, days),
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
    for (const day of days) await dbQA((db) => closePickupDate(db, day));
    // Keep real sandbox paid orders and their date references for audit.
  });
  test("active size accepts 20 units without stock rows, pays, receives a real webhook and confirms", async ({
    page,
    request,
  }) => {
    const response = await request.get("/api/commerce/availability");
    expect(response.status()).toBe(200);
    const schedule = await response.json();
    expect(schedule.availability.length).toBeGreaterThan(0);
    expect(
      schedule.availability.every(
        (row: { inventory: unknown }) => row.inventory === null,
      ),
    ).toBe(true);
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
    await dialog
      .getByRole("grid")
      .locator("button:not([disabled])")
      .first()
      .click();
    await dialog
      .getByRole("button", { name: "Continue to Stripe", exact: true })
      .click();
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
  test("a manual closure refreshes the calendar and prevents checkout without clearing the bag", async ({
    page,
    request,
    baseURL,
  }) => {
    await page.goto("/");
    const card = page.locator("article").filter({
      has: page.getByRole("link", {
        name: "View Classic Focaccia",
        exact: true,
      }),
    });
    await card.getByRole("button", { name: /Add to bag/ }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("button", { name: /^Checkout/ }).click();
    await dialog
      .getByRole("grid")
      .locator("button:not([disabled])")
      .first()
      .click();
    for (const day of days) await dbQA((db) => closePickupDate(db, day));
    const refreshed = page.waitForResponse((response) =>
      response.url().endsWith("/api/commerce/availability"),
    );
    await page.evaluate(() => window.dispatchEvent(new Event("focus")));
    await refreshed;
    await expect(
      dialog.getByRole("button", { name: "Continue to Stripe", exact: true }),
    ).toHaveCount(0);
    await expect(
      dialog.getByRole("heading", {
        name: "No Fridays fit this bag just yet.",
        exact: true,
      }),
    ).toBeVisible();
    const unitPrice = (await fetchCatalog())
      .find((p) => p.id === "classic-focaccia")
      ?.variants?.find((v) => v.id === "round")?.price;
    expect(typeof unitPrice).toBe("number");
    const result = await request.post("/api/commerce/checkout", {
      headers: { Origin: baseURL ?? "http://localhost:3001" },
      data: {
        items: [
          { productId: "classic-focaccia", variantId: "round", quantity: 1 },
        ],
        pickupDate: days[0],
        requestKey: crypto.randomUUID(),
        reviewedPrices: [
          { productId: "classic-focaccia", variantId: "round", unitPrice },
        ],
      },
    });
    expect(result.status()).toBe(409);
    expect((await result.json()).code).toBe("pickup_closed");
    await expect(
      page.getByRole("button", {
        name: "Open cart, 1 item",
        exact: true,
        includeHidden: true,
      }),
    ).toBeAttached();
  });
});
