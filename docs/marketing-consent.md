# Marketing email consent

The pickup step in the existing cart drawer includes an optional newsletter checkbox immediately above **Continue to Stripe**. It starts unchecked, is never required to purchase, and is disabled while checkout is being created. Checkbox wording is stored in **Studio → Commerce Copy → Marketing Consent → Label**. Clearing that optional label removes the checkbox and its wrapper. Editing the wording requires a new affirmative choice; the browser never carries a checked value over to revised wording.

[Stripe's hosted promotional-consent option](https://docs.stripe.com/payments/checkout/compliant-promotional-emails) is not enabled: its displayed/default state depends on jurisdiction. Salted owns this explicit unchecked choice before redirecting to hosted payment. No email is requested twice. The verified payment webhook attaches Stripe's submitted guest email to the same internal order that holds the consent snapshot.

## Stored evidence

The Drizzle migration `0002_tranquil_glorian.sql` adds these fields to `orders`:

| Field                       | Behavior                                                                                    |
| --------------------------- | ------------------------------------------------------------------------------------------- |
| `marketing_opt_in`          | Required boolean, defaults to false, including for historical orders                        |
| `marketing_consent_at`      | Server timestamp when an opted-in checkout is created; null for opt-out                     |
| `marketing_consent_source`  | `checkout_drawer` for opt-in; null for opt-out                                              |
| `marketing_consent_version` | SHA-256 of the normalized wording accepted at checkout                                      |
| `marketing_consent_text`    | The exact visible wording after removing Visual Editing encoding and surrounding whitespace |

A database constraint requires complete evidence for true and no affirmative evidence for false. Personal email and marketing choice remain in Postgres; they are not sent in Stripe metadata, put in analytics, or exposed by public order-confirmation routes. Authorized operator CSVs include the consent fields.

The API accepts a strict boolean, defaulting missing input to false. Opt-in also requires the displayed wording to match the current published Sanity wording fetched without a CDN/cache. Missing/cleared/stale wording fails safely; refresh to review it or uncheck the option to proceed. Opt-out never requires CMS consent content to exist.

Consent is part of the checkout fingerprint only when opted in. Existing opted-out request fingerprints remain compatible. Changing an affirmative choice or its wording requires a new checkout request; it cannot silently reuse a previous payable checkout with different consent. Retries reuse the original stored evidence and timestamp, even after later editorial edits. Duplicate webhooks and reconciliation attach payment/email data without changing that evidence.

## Setup and migrations

Test the committed Drizzle migration on a separate QA branch, then apply it to the intended app database:

```sh
npm run db:migrate
npm run cms:migrate-marketing-consent -- --dry-run
npm run cms:migrate-marketing-consent
```

The CMS migration needs a temporary server-only migration token. It adds only a missing dedicated marketing-consent group, preserves existing/cleared groups, uses revision guards and processes published/draft documents independently without publishing drafts. Seed copy is a migration artifact, never a frontend fallback. The API and frontend use generated centralized GROQ types; regenerate `schema.json` and `sanity.types.ts` after schema/query changes.

## Current preferences and unsubscribe

This feature records consent only. It sends no newsletters, creates no email-provider contacts and changes no payment receipt/order-notification behavior. Existing special-order previews, live-payment guard and commerce-enabled flag remain unchanged.

An order boolean is historical checkout evidence, not the current subscription state for an email address. `marketing_subscriptions` now maintains current subscriber status and withdrawals by normalized email. Customers can opt out at `/unsubscribe`. After deploying the route, the navigation migration adds a footer **Email preferences** link. See [unsubscribe behavior, migration and testing](unsubscribe.md).

A verified paid opted-in order updates current status in the payment transaction. It must have consent newer than both the stored consent and any withdrawal; delayed/duplicate payment events cannot reverse a later unsubscribe. An unchecked purchase leaves current status alone. Abandoned, cancelled or failed attempts do not enroll anyone. Migration `0003_chubby_hulk.sql` initializes existing affirmative, verified-payment evidence only and never overwrites current preferences. Default/historical false orders remain opted out.

Future delivery must use `canSendMarketingEmail` immediately before sending, not a historical order boolean or stale CSV. Necessary order updates and payment receipts remain separate. No email delivery service or provider contact synchronization is implemented.

## Verification

`npm test` covers boolean validation/defaults, stale/missing wording, retry identities, checkbox semantics/empty-label removal and migration preservation. `npm run test:integration` on a separate QA database covers false/no-evidence defaults, the database constraint, actual verified-email association, unchanged consent evidence across retries/events and abandoned opt-in orders without stored email.

With a sandbox-enabled local app, a manually opened Friday, active published products/sizes and official Stripe CLI forwarding running, execute:

```sh
npm run test:e2e -- tests/e2e/marketing-consent.spec.ts
```

The browser suite completes real sandbox payments both unchecked and checked, toggles the checkbox by keyboard, and checks the actual order/email/consent fields in Postgres. The test runner loads `.env.local` server-side; secrets are never passed to browser code. The app database must match the one configured in the running test app. Use only synthetic test contact details. Preserve any pre-existing operator QA menu/listener, and clean up any fixtures created specifically for the run.

## Executed verification — November 7, 2026

- Migration `0002_tranquil_glorian.sql` passed on the isolated QA branch before being applied to the configured app database. Historical orders default to false with null consent evidence.
- The revision-guarded CMS migration initialized the missing group in two published/draft documents and preserved existing copy/draft status.
- `npm run build`, `npm run lint`, `npm run typecheck` and `git diff --check` passed. All 74 unit tests and 14 real-Postgres integration tests passed.
- Both real sandbox UI scenarios passed (`2 passed (56.4s)`): unchecked saved false/null evidence; keyboard opt-in saved true with timestamp/source/accepted wording/hash. Each saved the actual email submitted to Stripe and reached a verified confirmation with an empty cart. Official Stripe CLI forwarding reported HTTP 200 for both corresponding `checkout.session.completed` events.
- The additional price-review UI scenario passed (`1 passed (9.6s)`): changing newsletter consent kept an already-acknowledged price review valid. This one UI test intercepted the checkout response and created no payment or reservation; the two payment tests used real Stripe/Neon operations.
- The operator CSV included all consent fields and used file mode 0600. The temporary verification export was removed afterward.
- The pre-existing operator QA menu, port-3000 dev server and port-3000 Stripe listener were preserved. Temporary port-3001 verification processes were stopped. No website was deployed and no live payments or newsletter delivery were enabled.
