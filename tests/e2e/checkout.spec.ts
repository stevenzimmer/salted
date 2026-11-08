import { test, expect, type Page } from "@playwright/test";
import { scheduleInput } from "../../src/lib/schedule-validation";
import { validPickupDates } from "../../src/lib/availability";

async function selectPickup(page: Page) {
  await page.goto("/");
  const card = page.locator("article").filter({
    has: page.getByRole("link", {
      name: "View Classic Focaccia",
      exact: true,
    }),
  });
  await card.getByRole("radio", { name: '8" × 8"', exact: true }).check();
  await card.getByRole("button", { name: /Add to bag/ }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: /^Checkout/ }).click();
  const available = dialog.getByRole("grid").locator("button:not([disabled])");
  await expect(available.first()).toBeVisible();
  await available.first().click();
  return dialog;
}
async function fillCard(page: Page, number: string) {
  await page
    .getByRole("textbox", { name: "email@example.com", exact: true })
    .fill("salted-phase3-qa@example.com");
  await page
    .getByRole("textbox", { name: "Full name", exact: true })
    .fill("Salted QA Customer");
  await page
    .getByRole("textbox", { name: "Card number", exact: true })
    .fill(number);
  await page
    .getByRole("textbox", { name: "Expiration", exact: true })
    .fill("1230");
  await page
    .getByRole("textbox", { name: "Credit or debit card CVC/CVV", exact: true })
    .fill("123");
  await page
    .getByRole("textbox", { name: "Cardholder name", exact: true })
    .fill("Salted QA Customer");
  await page.getByRole("textbox", { name: "ZIP", exact: true }).fill("95677");
  const link = page.getByRole("checkbox", {
    name: "Save my information with Link for faster checkout",
  });
  if (await link.count()) await link.uncheck();
}
async function redirectToStripe(page: Page) {
  const dialog = await selectPickup(page);
  await dialog
    .getByRole("button", { name: "Continue to Stripe", exact: true })
    .click();
  await expect(page).toHaveURL(/^https:\/\/checkout\.stripe\.com\//, {
    timeout: 45000,
  });
  await expect(page.getByText("Sandbox", { exact: true }).first()).toBeVisible({
    timeout: 30000,
  });
}
test("existing storefront through real sandbox payment returns a verified confirmation and clears the paid bag", async ({
  page,
}) => {
  await redirectToStripe(page);
  await fillCard(page, "4242424242424242");
  await page.getByRole("button", { name: "Pay", exact: true }).click();
  await expect(page).toHaveURL(/\/order\/success\?session_id=cs_test_/, {
    timeout: 60000,
  });
  const pending = page.getByRole("button", { name: "Check payment status" });
  if (await pending.count()) await pending.click();
  await expect(
    page.getByRole("heading", { name: "Your order is confirmed", exact: true }),
  ).toBeVisible({ timeout: 30000 });
  await expect(
    page.getByRole("button", { name: "Open cart, 0 items", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Storage & reheating instructions" }),
  ).toBeVisible();
  await expect(
    page.getByText("salted-phase3-qa@example.com", { exact: true }),
  ).toHaveCount(0);
});
test("declined sandbox card stays unpaid and returning preserves the bag until explicit Session cancellation", async ({
  page,
  request,
  baseURL,
}) => {
  await redirectToStripe(page);
  await fillCard(page, "4000000000000002");
  await page.getByRole("button", { name: "Pay", exact: true }).click();
  await expect(page.getByText(/card was declined/i)).toBeVisible({
    timeout: 30000,
  });
  await page.goto(`${baseURL}/?checkout=cancelled`);
  await expect(
    page.getByRole("button", { name: "Open cart, 1 item", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Open cart, 1 item", exact: true })
    .click();
  const [response] = await Promise.all([
    page.waitForResponse((r) => r.url().endsWith("/api/commerce/cancel")),
    page
      .getByRole("button", {
        name: "End my previous checkout",
        exact: true,
      })
      .click(),
  ]);
  expect(response.status()).toBe(200);
  expect((await request.get("/api/commerce/availability")).status()).toBe(200);
});
test("unverified success URL cannot display a paid confirmation", async ({
  page,
}) => {
  await page.goto("/order/success?session_id=cs_test_invented");
  await expect(
    page.getByRole("heading", { name: "Order confirmation unavailable" }),
  ).toBeVisible();
  await expect(
    page.getByText("Your order is confirmed", { exact: true }),
  ).toHaveCount(0);
});

test("checkout rejects empty carts, changed client prices and invalid webhook signatures", async ({
  request,
  baseURL,
}) => {
  const headers = { Origin: baseURL ?? "http://localhost:3000" };
  const invalid = await request.post("/api/commerce/checkout", {
    headers,
    data: {
      items: [],
      pickupDate: "2026-11-20",
      requestKey: crypto.randomUUID(),
      reviewedPrices: [],
    },
  });
  expect(invalid.status()).toBe(400);
  const availability = await request.get("/api/commerce/availability");
  expect(availability.status()).toBe(200);
  const schedule = scheduleInput.parse(await availability.json());
  const pickup = validPickupDates(
    [{ productId: "classic-focaccia", variantId: "square", quantity: 1 }],
    schedule,
  )[0];
  if (!pickup)
    throw new Error("An active QA offering and eligible Friday are required.");
  const changed = await request.post("/api/commerce/checkout", {
    headers,
    data: {
      items: [
        { productId: "classic-focaccia", variantId: "square", quantity: 1 },
      ],
      pickupDate: pickup.date,
      requestKey: crypto.randomUUID(),
      reviewedPrices: [
        { productId: "classic-focaccia", variantId: "square", unitPrice: 1 },
      ],
    },
  });
  expect(changed.status()).toBe(409);
  expect((await changed.json()).code).toBe("price_changed");
  const signature = await request.post("/api/stripe/webhook", {
    data: { id: "evt_unsigned", type: "checkout.session.completed" },
  });
  expect(signature.status()).toBe(400);
});

test("authentication-required card completes Stripe's real test challenge before confirming", async ({
  page,
}) => {
  await redirectToStripe(page);
  await fillCard(page, "4000002500003155");
  await page.getByRole("button", { name: "Pay", exact: true }).click();
  await expect
    .poll(
      () => page.frames().some((f) => f.name() === "stripe-challenge-frame"),
      { timeout: 30000 },
    )
    .toBe(true);
  const challenge = page
    .frames()
    .find((f) => f.name() === "stripe-challenge-frame");
  if (!challenge) throw new Error("Stripe authentication challenge missing");
  await challenge
    .getByRole("button", { name: "Complete", exact: true })
    .click();
  await expect(page).toHaveURL(/\/order\/success\?session_id=cs_test_/, {
    timeout: 60000,
  });
  await expect(
    page.getByRole("heading", { name: "Your order is confirmed", exact: true }),
  ).toBeVisible({ timeout: 30000 });
});
