import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  checkoutInput,
  cartFingerprint,
  hash,
} from "../src/commerce/validation";
import { resolveMarketingConsent } from "../src/commerce/marketing-consent";
import { MarketingConsentCheckbox } from "../src/components/commerce/marketing-consent-checkbox";
import {
  migrateMarketingConsentCopy,
  initialMarketingConsentCopy,
} from "../scripts/migrations/marketing-consent";
const label = initialMarketingConsentCopy.label;
function input() {
  return {
    items: [{ productId: "bread", variantId: "loaf", quantity: 1 }],
    pickupDate: "2026-11-20",
    requestKey: randomUUID(),
    reviewedPrices: [
      { productId: "bread", variantId: "loaf", unitPrice: 1200 },
    ],
  };
}
test("marketing opt-in defaults false and rejects coerced booleans or missing wording", () => {
  assert.equal(checkoutInput.parse(input()).marketingOptIn, false);
  for (const value of ["true", 1, null, {}, []])
    assert.equal(
      checkoutInput.safeParse({
        ...input(),
        marketingOptIn: value,
        marketingConsentText: label,
      }).success,
      false,
    );
  assert.equal(
    checkoutInput.safeParse({ ...input(), marketingOptIn: true }).success,
    false,
  );
  assert.equal(
    checkoutInput.safeParse({
      ...input(),
      marketingOptIn: true,
      marketingConsentText: " ",
    }).success,
    false,
  );
  assert.equal(
    checkoutInput.safeParse({
      ...input(),
      marketingOptIn: true,
      marketingConsentText: "x".repeat(2001),
    }).success,
    false,
  );
});
test("opt-in requires the current published wording and retains its source and SHA-256 version", () => {
  const choice = { marketingOptIn: true, marketingConsentText: label };
  assert.deepEqual(resolveMarketingConsent(choice, label), {
    optIn: true,
    text: label,
    version: hash(label),
    source: "checkout_drawer",
  });
  for (const value of [undefined, null, " ", "Changed newsletter wording"])
    assert.throws(() => resolveMarketingConsent(choice, value));
  assert.deepEqual(
    resolveMarketingConsent(
      { marketingOptIn: false, marketingConsentText: label },
      label,
    ),
    { optIn: false, text: null, version: null, source: null },
  );
});
test("consent changes alter checkout retry identity; unchecked requests preserve the pre-consent fingerprint", () => {
  const request = checkoutInput.parse(input());
  const oldFingerprint = hash(
    JSON.stringify({
      date: request.pickupDate,
      items: request.items,
      prices: request.reviewedPrices,
    }),
  );
  assert.equal(cartFingerprint(request), oldFingerprint);
  assert.equal(
    cartFingerprint({
      ...request,
      marketingConsentText: "ignored when unchecked",
    }),
    oldFingerprint,
  );
  const accepted = {
    ...request,
    marketingOptIn: true,
    marketingConsentText: label,
  };
  assert.notEqual(cartFingerprint(accepted), oldFingerprint);
  assert.notEqual(
    cartFingerprint(accepted),
    cartFingerprint({ ...accepted, marketingConsentText: "Different wording" }),
  );
});
test("optional native checkbox is unchecked, not required, associated with its visible label, and disabled during checkout", () => {
  const render = (
    checked = false,
    disabled = false,
    copy: string | undefined = label,
  ) =>
    renderToStaticMarkup(
      createElement(MarketingConsentCheckbox, {
        label: copy,
        checked,
        disabled,
        onChange: () => {},
      }),
    );
  const html = render();
  assert.match(html, /<label/);
  assert.match(html, /type="checkbox"/);
  assert.match(html, /name="marketingOptIn"/);
  assert.match(html, /I can unsubscribe anytime/);
  assert.doesNotMatch(html, /checked=|required=/);
  assert.match(render(true, true), /checked=""/);
  assert.match(render(true, true), /disabled=""/);
  assert.equal(render(false, false, " "), "");
});
test("consent copy migration is idempotent and preserves deliberately empty or cleared groups", () => {
  const update = migrateMarketingConsentCopy({
    checkout: { pay: "Keep this" },
  });
  assert.deepEqual(update, { marketingConsent: initialMarketingConsentCopy });
  for (const marketingConsent of [
    {},
    { label: "" },
    { label: "Custom wording" },
    null,
  ])
    assert.equal(migrateMarketingConsentCopy({ marketingConsent }), null);
});
