import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { render } from "react-email";
import {
  createConfirmationToken,
  verifyConfirmationToken,
  confirmationEmailUrl,
} from "../src/commerce/confirmation-token";
import {
  OrderConfirmationEmail,
  type OrderConfirmationEmailProps,
} from "../src/emails/order-confirmation";
import { createElement } from "react";
import {
  stripeReceiptUrl,
  sendTransactionalEmail,
} from "../src/commerce/email";
import {
  initialOrderEmailCopy,
  migrateOrderEmailCopy,
  initialOrderEmailPickup,
  migrateOrderEmailPickup,
} from "../scripts/migrations/order-email";
const secret = "qa-only-confirmation-secret-32-characters";

test("confirmation links use a fragment and authorize only a signed order identity", () => {
  const id = randomUUID();
  const token = createConfirmationToken(id, secret);
  assert.equal(verifyConfirmationToken(token, secret), id);
  assert.equal(verifyConfirmationToken(token, `${secret}-changed`), null);
  assert.equal(
    verifyConfirmationToken(token.replace(id, randomUUID()), secret),
    null,
  );
  for (const invalid of [
    undefined,
    null,
    "",
    token.slice(0, -1),
    `${token}x`,
    "v1.invalid.signature",
  ])
    assert.equal(verifyConfirmationToken(invalid, secret), null);
  const url = new URL(
    confirmationEmailUrl(id, "https://saltedfocaccia.com", secret),
  );
  assert.equal(url.pathname, "/order/open");
  assert.equal(url.search, "");
  assert.equal(
    new URLSearchParams(url.hash.slice(1)).get("confirmation"),
    token,
  );
  assert.throws(() => confirmationEmailUrl(id, "http://example.com", secret));
  assert.throws(() => createConfirmationToken(id, "short"));
});
test("receipt links require a secure Stripe domain", () => {
  assert.equal(
    stripeReceiptUrl("https://pay.stripe.com/receipts/test"),
    "https://pay.stripe.com/receipts/test",
  );
  for (const url of [
    null,
    "javascript:alert(1)",
    "https://stripe.com.evil.test/receipt",
    "https://evilstripe.com/receipt",
    "http://pay.stripe.com/receipt",
    "https://user@pay.stripe.com/receipt",
  ])
    assert.throws(() => stripeReceiptUrl(url));
});
const props: OrderConfirmationEmailProps = {
  audience: "customer",
  copy: initialOrderEmailCopy,
  pickupGuidance: "Published pickup guidance only.",
  receiptUrl: "https://pay.stripe.com/receipts/test",
  confirmationUrl: "https://saltedfocaccia.com/order/open#confirmation=example",
  wordmarkUrl: "https://saltedfocaccia.com/images/brand/email-wordmark.png",
  order: {
    number: "SF-EXAMPLE",
    customerName: "Private Customer",
    customerEmail: "private@example.invalid",
    customerPhone: "+15555555555",
    totalCents: 2450,
    pickup: {
      date: "2026-11-20",
      startTime: "14:00:00",
      endTime: "18:00:00",
      timezone: "America/Los_Angeles",
    },
    items: [
      {
        name: "Bread <script>",
        variant: "Whole",
        quantity: 2,
        lineTotalCents: 2450,
      },
    ],
  },
};
test("customer and business templates include accurate pickup, totals and links with private contact details only in the business copy", async () => {
  const html = await render(createElement(OrderConfirmationEmail, props));
  const text = await render(createElement(OrderConfirmationEmail, props), {
    plainText: true,
  });
  assert.match(html, /email-wordmark\.png/);
  assert.match(html, /alt="Salted Focaccia"/);
  assert.match(html, /Bread &lt;script&gt;/);
  assert.doesNotMatch(
    html,
    /<script>|private@example.invalid|Private Customer|15555555555/,
  );
  for (const output of [html, text]) {
    assert.match(output, /November 20, 2026/);
    assert.match(output, /2–6pm/);
    assert.doesNotMatch(output, /America\/Los_Angeles|\bPT\b/);
    assert.match(output, /\$24\.50/);
    assert.match(output, /https:\/\/pay.stripe.com\/receipts\/test/);
    assert.match(output, /order\/open#confirmation=example/);
    assert.ok(output.includes(initialOrderEmailPickup.pickupAddress));
    // React escapes ampersands in HTML, while plain text preserves the full destination.
    assert.ok(
      output
        .replaceAll("&amp;", "&")
        .includes(initialOrderEmailPickup.pickupDirectionsUrl),
    );
  }
  const business = await render(
    createElement(OrderConfirmationEmail, { ...props, audience: "business" }),
    { plainText: true },
  );
  assert.match(business, /private@example.invalid/);
  assert.match(business, /Private Customer/);
  assert.match(business, /15555555555/);
  assert.doesNotMatch(business, /America\/Los_Angeles|\bPT\b/);
  assert.ok(!business.includes(initialOrderEmailPickup.pickupAddress));
  assert.ok(!business.includes(initialOrderEmailPickup.pickupDirectionsUrl));
});
test("cleared CMS slots remove editorial elements without seed fallbacks", async () => {
  const html = await render(
    createElement(OrderConfirmationEmail, {
      ...props,
      copy: {},
      pickupGuidance: "",
    }),
  );
  assert.doesNotMatch(
    html,
    /Your order is confirmed|View Stripe receipt|View order confirmation|Published pickup|Mountaingate|Google Maps/,
  );
  assert.match(html, /SF-EXAMPLE/);
  assert.equal(migrateOrderEmailCopy({ orderEmail: {} }), null);
  assert.equal(migrateOrderEmailCopy({ orderEmail: null }), null);
  assert.deepEqual(migrateOrderEmailCopy({}), {
    orderEmail: initialOrderEmailCopy,
  });
});

test("pickup copy migration initializes absent fields without overwriting editorial choices", () => {
  assert.deepEqual(
    migrateOrderEmailPickup({
      orderEmail: { customerHeading: "Edited heading" },
    }),
    {
      "orderEmail.pickupAddress": initialOrderEmailPickup.pickupAddress,
      "orderEmail.pickupDirectionsLabel":
        initialOrderEmailPickup.pickupDirectionsLabel,
      "orderEmail.pickupDirectionsUrl":
        initialOrderEmailPickup.pickupDirectionsUrl,
    },
  );
  for (const group of [
    undefined,
    null,
    {},
    { _type: "object" },
    {
      customerHeading: "Edited",
      pickupAddress: "",
      pickupDirectionsLabel: null,
      pickupDirectionsUrl: "https://maps.google.com/edited",
    },
  ]) {
    assert.equal(migrateOrderEmailPickup({ orderEmail: group }), null);
  }
  assert.equal(
    migrateOrderEmailPickup({ orderEmail: initialOrderEmailCopy }),
    null,
  );
});

test("Resend transport sends HTML and plain text with a stable idempotency key and redacts failures", async (context) => {
  const previousKey = process.env.RESEND_API_KEY;
  process.env.RESEND_API_KEY = "re_synthetic_transport_test";
  const payload = {
    from: "feedme@saltedfocaccia.com",
    to: "example@example.invalid",
    replyTo: "feedme@saltedfocaccia.com",
    subject: "SF-EXAMPLE",
    html: "<p>Example</p>",
    text: "Example",
  };
  try {
    const mockFetch = context.mock.method(
      globalThis,
      "fetch",
      async (url: string, options: RequestInit) => {
        assert.equal(url, "https://api.resend.com/emails");
        const headers = new Headers(options.headers);
        assert.equal(headers.get("Idempotency-Key"), "salted-order/example");
        assert.equal(
          headers.get("Authorization"),
          "Bearer re_synthetic_transport_test",
        );
        assert.deepEqual(JSON.parse(String(options.body)), {
          from: payload.from,
          to: [payload.to],
          reply_to: payload.replyTo,
          subject: payload.subject,
          html: payload.html,
          text: payload.text,
        });
        assert.ok(options.signal);
        return Response.json({ id: "email-example" });
      },
    );
    assert.equal(
      await sendTransactionalEmail(payload, "salted-order/example"),
      "email-example",
    );
    mockFetch.mock.mockImplementation(async () =>
      Response.json({ message: "private provider response" }, { status: 429 }),
    );
    await assert.rejects(
      sendTransactionalEmail(payload, "salted-order/example"),
      { message: "Transactional email request failed." },
    );
  } finally {
    if (previousKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = previousKey;
  }
});
