import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import Stripe from "stripe";
import {
  checkoutInput,
  CommerceError,
  totalCents,
  pricesMatch,
} from "../src/commerce/validation";
import { priceCart } from "../src/commerce/catalog";
import { pickupCutoff } from "../src/commerce/pickups";
import { sessionParams } from "../src/commerce/checkout";
import { verifyWebhook } from "../src/commerce/webhook";
import { stripeClient } from "../src/commerce/config";
const input = () => ({
  marketingOptIn: false,
  items: [{ productId: "bread", variantId: "loaf", quantity: 2 }],
  pickupDate: "2026-11-20",
  requestKey: randomUUID(),
  reviewedPrices: [{ productId: "bread", variantId: "loaf", unitPrice: 1250 }],
});
const catalog = [
  {
    _id: "product-bread",
    id: "bread",
    active: true,
    displayName: "Bread",
    variants: [{ id: "loaf", active: true, label: "Loaf", price: 1250 }],
  },
];
test("default Stripe checkout still requires configured test keys", () => {
  const before = process.env.STRIPE_SECRET_KEY;
  try {
    for (const key of [
      undefined,
      "",
      "sk_live_unit_only",
      "rk_live_unit_only",
    ]) {
      if (key === undefined) delete process.env.STRIPE_SECRET_KEY;
      else process.env.STRIPE_SECRET_KEY = key;
      assert.throws(
        () => stripeClient(),
        (error: unknown) =>
          error instanceof CommerceError &&
          error.code === "test_keys_required" &&
          error.status === 503,
      );
    }
    for (const key of ["sk_test_unit_only", "rk_test_unit_only"]) {
      process.env.STRIPE_SECRET_KEY = key;
      assert.doesNotThrow(() => stripeClient());
    }
  } finally {
    if (before === undefined) delete process.env.STRIPE_SECRET_KEY;
    else process.env.STRIPE_SECRET_KEY = before;
  }
});
test("strict checkout input rejects money, extra dates, duplicate identities and malformed quantities", () => {
  assert.ok(checkoutInput.safeParse(input()).success);
  for (const invalid of [
    { ...input(), total: 1 },
    { ...input(), pickupDate: "2026-11-19" },
    { ...input(), pickupDate: "2026-02-30" },
    { ...input(), items: [] },
    { ...input(), items: [input().items[0], input().items[0]] },
    ...[-1, 0, 1.1, 21, Infinity, "2"].map((quantity) => ({
      ...input(),
      items: [{ ...input().items[0], quantity }],
    })),
  ])
    assert.equal(checkoutInput.safeParse(invalid).success, false);
});
test("pricing uses published catalog integer cents and rejects disabled identities", () => {
  const lines = priceCart(input(), catalog);
  assert.equal(totalCents(lines), 2500);
  assert.equal(
    pricesMatch(lines, [
      { productId: "bread", variantId: "loaf", unitPrice: 1 },
    ]),
    false,
  );
  assert.throws(() => priceCart(input(), [{ ...catalog[0], active: false }]));
  assert.throws(() =>
    priceCart(input(), [
      {
        ...catalog[0],
        variants: [{ ...catalog[0].variants[0], active: false }],
      },
    ]),
  );
  assert.throws(() =>
    priceCart(input(), [
      { ...catalog[0], variants: [{ ...catalog[0].variants[0], price: 12.5 }] },
    ]),
  );
  assert.throws(() => priceCart(input(), [catalog[0], catalog[0]]));
  assert.throws(() => totalCents([{ unitPrice: 10_000_000, quantity: 20 }]));
});
test("Wednesday cutoff uses Pacific offset across both DST transitions", () => {
  assert.equal(
    pickupCutoff("2026-03-06").toISOString(),
    "2026-03-05T07:59:59.000Z",
  );
  assert.equal(
    pickupCutoff("2026-03-13").toISOString(),
    "2026-03-12T06:59:59.000Z",
  );
  assert.equal(
    pickupCutoff("2026-10-30").toISOString(),
    "2026-10-29T06:59:59.000Z",
  );
  assert.equal(
    pickupCutoff("2026-11-06").toISOString(),
    "2026-11-05T07:59:59.000Z",
  );
});
test("Session parameters contain only validated cents, fixed USD and immediate cards/wallets", () => {
  const i = input();
  const params = sessionParams(
    i,
    priceCart(i, catalog),
    randomUUID(),
    new Date(Date.now() + 32 * 60_000),
  );
  assert.equal(params.mode, "payment");
  assert.deepEqual(params.allowed_payment_method_types, ["card"]);
  assert.equal(params.wallet_options?.link?.display, "never");
  assert.equal(params.line_items?.[0].price_data?.unit_amount, 1250);
  assert.equal(params.shipping_address_collection, undefined);
  assert.equal(params.allow_promotion_codes, undefined);
  assert.equal(params.metadata?.pickup_date, "2026-11-20");
  assert.equal(params.adaptive_pricing?.enabled, false);
});
test("Stripe signature verifier accepts signed raw bodies and rejects changed bodies and invalid/old signatures", () => {
  const before = process.env.STRIPE_SECRET_KEY;
  process.env.STRIPE_SECRET_KEY = "sk_test_signature_unit_only";
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const secret = "whsec_signature_unit_only";
    const body = JSON.stringify({
      id: "evt_unit",
      object: "event",
      type: "checkout.session.completed",
    });
    const signature = stripe.webhooks.generateTestHeaderString({
      payload: body,
      secret,
    });
    assert.equal(verifyWebhook(body, signature, secret).id, "evt_unit");
    assert.throws(() => verifyWebhook(body + " ", signature, secret));
    assert.throws(() => verifyWebhook(body, "invalid", secret));
    assert.throws(() =>
      verifyWebhook(
        body,
        stripe.webhooks.generateTestHeaderString({
          payload: body,
          secret,
          timestamp: 1,
        }),
        secret,
      ),
    );
  } finally {
    if (before) process.env.STRIPE_SECRET_KEY = before;
    else delete process.env.STRIPE_SECRET_KEY;
  }
});
