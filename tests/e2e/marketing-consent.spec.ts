import { test, expect } from "@playwright/test";
import { eq } from "drizzle-orm";
import { withDatabase } from "../../src/db/client";
import { orders } from "../../src/db/schema";
import { hash } from "../../src/commerce/validation";

test.describe("newsletter choice through real sandbox checkout", () => {
  test.skip(
    !process.env.DATABASE_URL ||
      !process.env.STRIPE_SECRET_KEY?.includes("_test_"),
    "Load the app's sandbox environment to verify the resulting database order.",
  );
  for (const optedIn of [false, true]) {
    test(`persists ${optedIn ? "explicit opt-in" : "default opt-out"} with the email provided to Stripe`, async ({
      page,
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
      const checkbox = dialog.getByRole("checkbox");
      await expect(checkbox).not.toBeChecked();
      await expect(checkbox).not.toHaveAttribute("required");
      const consentLabel = (await checkbox.locator("..").textContent())?.trim();
      expect(consentLabel).toBeTruthy();
      if (optedIn) {
        await checkbox.focus();
        await checkbox.press("Space");
        await expect(checkbox).toBeChecked();
      }
      const pay = dialog.getByRole("button", {
        name: "Continue to Stripe",
        exact: true,
      });
      await expect(pay).toBeEnabled();
      await pay.click();
      await expect(page).toHaveURL(/^https:\/\/checkout\.stripe\.com\//, {
        timeout: 45000,
      });
      const email = `qa-marketing-${optedIn ? "opt-in" : "opt-out"}@example.com`;
      await page
        .getByRole("textbox", { name: "email@example.com", exact: true })
        .fill(email);
      await page
        .getByRole("textbox", { name: "Full name", exact: true })
        .fill("Synthetic Marketing QA");
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
        .fill("Synthetic Marketing QA");
      await page
        .getByRole("textbox", { name: "ZIP", exact: true })
        .fill("95677");
      await page.getByRole("button", { name: "Pay", exact: true }).click();
      await expect(page).toHaveURL(/\/order\/success\?session_id=cs_test_/, {
        timeout: 60000,
      });
      const sessionId = new URL(page.url()).searchParams.get("session_id");
      if (!sessionId) throw new Error("Missing checkout session");
      const readOrder = () =>
        withDatabase(
          async (db) =>
            (
              await db
                .select({
                  marketingOptIn: orders.marketingOptIn,
                  at: orders.marketingConsentAt,
                  source: orders.marketingConsentSource,
                  version: orders.marketingConsentVersion,
                  text: orders.marketingConsentText,
                  email: orders.customerEmail,
                  status: orders.paymentStatus,
                })
                .from(orders)
                .where(eq(orders.stripeCheckoutSessionId, sessionId))
            )[0],
        );
      await expect
        .poll(async () => (await readOrder())?.status, { timeout: 30000 })
        .toBe("paid");
      const order = await readOrder();
      expect(order.email).toBe(email);
      expect(order.marketingOptIn).toBe(optedIn);
      if (optedIn) {
        expect(order.at).toBeInstanceOf(Date);
        expect(order.source).toBe("checkout_drawer");
        expect(order.text).toBe(consentLabel);
        expect(order.version).toBe(hash(consentLabel ?? ""));
      } else {
        expect(order.at).toBeNull();
        expect(order.source).toBeNull();
        expect(order.version).toBeNull();
        expect(order.text).toBeNull();
      }
      await expect(
        page.getByRole("heading", {
          name: "Your order is confirmed",
          exact: true,
        }),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Open cart, 0 items", exact: true }),
      ).toBeVisible();
    });
  }
});

test("newsletter choice does not invalidate an acknowledged price review", async ({
  page,
}) => {
  await page.goto("/");
  const card = page
    .locator("article")
    .filter({
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
  // Exercise the server-price-review UI without creating another payable Session.
  await page.route("**/api/commerce/checkout", async (route) => {
    const payload = route.request().postDataJSON();
    const price = payload.reviewedPrices[0];
    await route.fulfill({
      status: 409,
      json: {
        code: "price_changed",
        prices: [
          {
            ...price,
            productName: "Classic Focaccia",
            variantName: "Round",
            quantity: 1,
          },
        ],
      },
    });
  });
  const pay = dialog.getByRole("button", {
    name: "Continue to Stripe",
    exact: true,
  });
  await pay.click();
  const review = dialog.getByRole("button", {
    name: "I have reviewed these prices",
    exact: true,
  });
  await expect(review).toBeVisible();
  await review.click();
  await expect(pay).toBeEnabled();
  const checkbox = dialog.getByRole("checkbox");
  await checkbox.check();
  await expect(pay).toBeEnabled();
  await expect(review).toHaveCount(0);
  await checkbox.uncheck();
  await expect(pay).toBeEnabled();
});
