import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { render } from "react-email";
import {
  specialOrderSubmissionInput,
  validateSpecialOrder,
} from "../src/lib/special-orders";
import { specialOrderFingerprint } from "../src/special-orders/store";
import { SpecialOrderForm } from "../src/components/special-orders/special-order-form";
import { SpecialOrderNotificationEmail } from "../src/emails/special-order-notification";
import {
  activateSpecialOrderCopy,
  specialOrderLiveCopy,
} from "../scripts/migrations/activate-special-orders";

const request = {
  requestKey: randomUUID(),
  name: "Test Customer",
  email: "PERSON@example.com",
  phone: "9165550100",
  date: "2099-01-01",
  products: "Four pans for a birthday. Please slice.",
};
test("special-order API input bounds contacts and details, normalizes email and requires explicit valid consent", () => {
  const parsed = specialOrderSubmissionInput.parse(request);
  assert.equal(parsed.email, "person@example.com");
  assert.equal(parsed.marketingOptIn, false);
  for (const invalid of [
    { ...request, products: "x".repeat(3001) },
    { ...request, name: "x".repeat(121) },
    { ...request, email: "broken" },
    { ...request, phone: "123" },
    { ...request, quantity: "2" },
    { ...request, marketingOptIn: "true" },
    { ...request, marketingOptIn: true },
    { ...request, marketingOptIn: true, marketingConsentText: " " },
  ])
    assert.equal(specialOrderSubmissionInput.safeParse(invalid).success, false);
  assert.ok(validateSpecialOrder({ ...request, date: "2099-02-30" }).date);
  assert.ok(validateSpecialOrder({ ...request, date: "2000-01-01" }).date);
  assert.notEqual(
    specialOrderFingerprint(parsed),
    specialOrderFingerprint({ ...parsed, products: "Two pans for dinner." }),
  );
});
test("special-order form uses the shared optional unchecked checkbox and removes it when wording is cleared", () => {
  const html = renderToStaticMarkup(
    createElement(SpecialOrderForm, {
      copy: specialOrderLiveCopy,
      marketingConsentLabel: "Send me newsletters.",
    }),
  );
  assert.match(html, /name="marketingOptIn"/);
  assert.doesNotMatch(html, /checked=""/);
  assert.match(html, /Send my request/);
  assert.doesNotMatch(html, /Preview my request/);
  const cleared = renderToStaticMarkup(
    createElement(SpecialOrderForm, { marketingConsentLabel: " " }),
  );
  assert.doesNotMatch(cleared, /name="marketingOptIn"/);
});
test("special-order notification escapes customer input and keeps all details when optional labels are cleared", async () => {
  const html = await render(
    createElement(SpecialOrderNotificationEmail, {
      request: {
        ...request,
        id: randomUUID(),
        requestedDate: request.date,
        products: "<script>alert('bad')</script>\nFour pans for dinner.",
        marketingOptIn: false,
        marketingConsentText: null,
      },
    }),
  );
  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /&lt;script&gt;/);
  assert.match(html, /9165550100/);
  assert.match(html, /2099-01-01/);
});
test("activation copy replaces known preview wording and preserves custom copy, cleared fields and drafts", () => {
  const updates = activateSpecialOrderCopy({
    _id: "drafts.specialOrdersPage",
    form: {
      submit: "Preview my request",
      note: "",
      successBody: "Custom response",
    },
  });
  assert.equal(updates?.["form.submit"], "Send my request");
  assert.equal(updates?.["form.note"], undefined);
  assert.equal(updates?.["form.successBody"], undefined);
  assert.equal(updates?._id, undefined);
  assert.equal(
    activateSpecialOrderCopy({
      form: specialOrderLiveCopy,
      notificationEmail: null,
    }),
    null,
  );
});
