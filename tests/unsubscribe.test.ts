import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import {
  createUnsubscribeToken,
  createUnsubscribeUrl,
  verifyUnsubscribeToken,
} from "../src/marketing/tokens";
import { marketingEmail, unsubscribeInput } from "../src/lib/marketing-input";
import {
  migrateUnsubscribeCopy,
  migrateUnsubscribeNavigation,
  initialUnsubscribeCopy,
} from "../scripts/migrations/unsubscribe";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { UnsubscribeForm } from "../src/components/marketing/unsubscribe-form";
const secret = "test-only-unsubscribe-secret-32-characters-long";
test("unsubscribe input normalizes email and rejects unsafe or ambiguous requests", () => {
  assert.equal(
    marketingEmail.parse(" Person+news@Example.COM "),
    "person+news@example.com",
  );
  assert.deepEqual(
    unsubscribeInput.parse({ method: "email", email: " Person@Example.COM " }),
    { method: "email", email: "person@example.com" },
  );
  for (const value of [
    null,
    {},
    { method: "email", email: "" },
    { method: "email", email: "a@b.com\r\nBcc: other@example.com" },
    { method: "email", email: "a".repeat(255) + "@example.com" },
    { method: "email", email: "a@b.com", subscribed: true },
    { method: "email", email: "a@b.com", token: "anything" },
    { method: "token", token: "garbage" },
  ])
    assert.equal(unsubscribeInput.safeParse(value).success, false);
});
test("signed unsubscribe capabilities are purpose-bound, opaque and tamper resistant", () => {
  const id = randomUUID(),
    other = randomUUID();
  const token = createUnsubscribeToken(id, secret);
  assert.equal(verifyUnsubscribeToken(token, secret), id);
  assert.equal(
    verifyUnsubscribeToken(
      createUnsubscribeToken(id.toUpperCase(), secret),
      secret,
    ),
    id,
  );
  assert.equal(verifyUnsubscribeToken(token.replace(id, other), secret), null);
  assert.equal(verifyUnsubscribeToken(token, secret + "other"), null);
  assert.equal(
    verifyUnsubscribeToken(token.replace(/^v1/, "v2"), secret),
    null,
  );
  for (const value of [null, {}, "", token + "extra", "a".repeat(10000)])
    assert.equal(verifyUnsubscribeToken(value, secret), null);
  assert.throws(() => createUnsubscribeToken(id, "short"));
  assert.throws(() => createUnsubscribeToken("person@example.com", secret));
  assert.throws(() => verifyUnsubscribeToken(token, "short"));
});
test("unsubscribe URLs keep capabilities out of request paths, query strings and email addresses", () => {
  const id = randomUUID();
  const url = new URL(
    createUnsubscribeUrl(id, "https://saltedfocaccia.com", secret),
  );
  assert.equal(url.pathname, "/unsubscribe");
  assert.equal(url.search, "");
  assert.equal(
    verifyUnsubscribeToken(
      new URLSearchParams(url.hash.slice(1)).get("token"),
      secret,
    ),
    id,
  );
  assert.ok(!url.href.includes("@"));
  assert.throws(() =>
    createUnsubscribeUrl(id, "http://saltedfocaccia.com", secret),
  );
  assert.match(
    createUnsubscribeUrl(id, "http://localhost:3000", secret),
    /^http:\/\/localhost:3000\/unsubscribe#token=/,
  );
});
test("unsubscribe copy and navigation migrations preserve editorial choices, drafts and full menus", () => {
  assert.deepEqual(migrateUnsubscribeCopy({}), {
    unsubscribe: initialUnsubscribeCopy,
  });
  for (const unsubscribe of [
    null,
    {},
    { title: "" },
    { title: "My custom title" },
  ])
    assert.equal(migrateUnsubscribeCopy({ unsubscribe }), null);
  const item = { _key: "unsubscribe", label: "Bread care", href: "/storage" };
  const updates = migrateUnsubscribeNavigation({ footerNavigation: [item] });
  assert.equal(updates?.footerNavigation[0], item);
  assert.notEqual(updates?.footerNavigation[1]._key, item._key);
  assert.equal(updates?.footerNavigation[1].href, "/unsubscribe");
  assert.equal(migrateUnsubscribeNavigation(updates ?? {}), null);
  for (const footerNavigation of [
    undefined,
    null,
    [],
    [{ href: "/unsubscribe", label: "Custom" }],
    Array.from({ length: 7 }, () => item),
  ])
    assert.equal(migrateUnsubscribeNavigation({ footerNavigation }), null);
});
test("unsubscribe form uses optional CMS copy without restoring cleared labels or wrappers", () => {
  const markup = renderToStaticMarkup(
    createElement(UnsubscribeForm, { copy: initialUnsubscribeCopy }),
  );
  assert.match(markup, /type="email"/);
  assert.match(markup, /Unsubscribe/);
  const cleared = renderToStaticMarkup(
    createElement(UnsubscribeForm, {
      copy: {
        ...initialUnsubscribeCopy,
        emailLabel: "",
        emailPlaceholder: "",
        backHome: "",
      },
    }),
  );
  assert.match(cleared, /class="sr-only">Email address/);
  assert.ok(!cleared.includes("placeholder="));
  assert.ok(!cleared.includes('href="/"'));
  assert.equal(
    renderToStaticMarkup(createElement(UnsubscribeForm, { copy: {} })),
    "",
  );
});
