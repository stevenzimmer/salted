# Unsubscribe and current email preferences

Customers visit `/unsubscribe`, enter an email address and select **Unsubscribe**. After the route is deployed, the navigation migration adds **Email preferences** to the CMS footer menu. Successful submissions return the same confirmation for known, unknown and already-unsubscribed addresses. The page never reveals membership, an order or contact details. It does not require an account, inbox verification or email delivery. A valid address is accepted directly as an opt-out request; it is not proof of ownership for accessing other data.

Only marketing permission changes. Original order consent, orders, pickup information and necessary payment/order messages are unaffected. No newsletters are sent or email-provider contacts created by this feature.

## Storage and state transitions

Drizzle migration `0003_chubby_hulk.sql` creates `marketing_subscriptions`:

| Field                                      | Purpose                                                 |
| ------------------------------------------ | ------------------------------------------------------- |
| `id`                                       | Stable random UUID used in signed links                 |
| `email`                                    | Trimmed lowercase address, unique and constrained       |
| `subscribed`                               | Current permission boolean; missing records fail closed |
| `last_consent_order_id`, `last_consent_at` | Most recent accepted affirmative paid-checkout evidence |
| `unsubscribed_at`, `unsubscribe_source`    | Latest withdrawal, from `public_form` or `signed_link`  |
| `created_at`, `updated_at`                 | Operational timestamps                                  |

The migration initializes only existing explicitly opted-in orders with a verified paid/refunded payment and stored email. It chooses the newest affirmative consent per address and uses `ON CONFLICT DO NOTHING`. Unchecked/default orders are never enrolled. Reruns of the normal migration runner do not reprocess it or overwrite current preferences.

Verified payment fulfillment updates current consent in the same Postgres transaction as the paid order and inventory sale. The consent timestamp must be newer than both the current consent and latest withdrawal. A checkout started before an unsubscribe, even if paid later, cannot reverse it. Duplicate/reconciled payment events cannot resubscribe. A genuinely later affirmative paid checkout can resubscribe; an unchecked purchase changes no preference. Upserts and the unique normalized-email index serialize concurrent changes.

Every explicit opt-out refreshes the withdrawal timestamp, including repeated requests for an already-suppressed address. This prevents consent captured since an earlier withdrawal, but still awaiting payment, from winning over the latest request. Repetition creates no extra subscriber or order. Historical `orders.marketing_opt_in` and its evidence are never rewritten.

Future senders must call `canSendMarketingEmail` with the actual recipient address immediately before delivery. Missing/false status means no marketing. Operator pickup CSVs include both historical consent and `marketingSubscribedNow` / `marketingUnsubscribedAt`; an export is a point-in-time record, never a durable mailing list. Provider suppression synchronization, campaign delivery and email templates remain future work.

## Request and link security

`POST /api/marketing/unsubscribe` accepts a strict Zod union: `{method:"email", email}` or `{method:"token", token}`. It rejects extra fields, invalid email, oversized bodies and cross-origin requests. Responses never include customer data. No GET mutates state. Database/secret failures return a retryable error rather than displaying false confirmation.

Requests are limited to 30 per five-minute window using purpose-specific HMAC buckets in the existing `checkout_rate_limits` table, with the trusted Vercel client header and `RATE_LIMIT_SECRET`. Raw IPs and email addresses are not stored in that limiter. Operators can remove buckets older than 24 hours with `npm run commerce:prune-rate-limits`; this never changes orders or preferences. Local requests share one development bucket.

Future newsletters can call `createUnsubscribeUrl(subscriptionId, siteOrigin)` server-side. It produces a purpose-bound HMAC-SHA256 link in the form `/unsubscribe#token=v1.…`. The signed capability contains a UUID, never an email address. The fragment stays out of HTTP request paths/query strings and referrer headers. Visiting the page is read-only; the customer selects **Confirm unsubscribe** before the capability is POSTed. Mail link scanners therefore cannot opt someone out just by visiting. Invalid links offer the ordinary email form.

This is a confirmation-page link, not an RFC 8058 one-click mail-header endpoint. Any future email provider requiring that protocol needs a separately designed endpoint. Links have no expiration so an old newsletter still offers a usable opt-out. Keep `MARKETING_UNSUBSCRIBE_SECRET` stable; key rotation invalidates existing signed links but leaves the email form usable. Do not log tokens or email request bodies.

The preference page uses its own root layout with the existing fonts, cream/copper styles, brand and CMS footer, without Google Analytics or cart state. Navigation between root layouts performs a full page load; the persisted cart is retained. The page sends `Referrer-Policy: no-referrer`, is non-indexable and is dynamically rendered. Studio Visual Editing remains available in Draft Mode. Visible labels/messages live in optional **Commerce Copy → Unsubscribe** fields; cleared fields disappear.

## Setup

Use Node 24 and test migrations on an isolated QA branch before the intended application database:

```sh
npm run db:migrate
npm run cms:migrate-unsubscribe -- --dry-run
npm run cms:migrate-unsubscribe
```

The copy migration initializes only a missing unsubscribe group. After deploying and checking the route, run `npm run cms:migrate-unsubscribe -- --include-navigation` to append a normal editable footer item if the existing menu contains fewer than seven items. Navigation is an explicit post-deployment step because older sites sharing the CMS do not yet have this route. The migration preserves empty/missing/full menus, existing unsubscribe links, all other fields and draft status, using revision guards. If a menu is full, replace a menu item manually in Studio rather than exceeding the existing limit. No frontend default copy is introduced.

The form needs `DATABASE_URL`, `RATE_LIMIT_SECRET`, Sanity read configuration and the correct build-time `NEXT_PUBLIC_SITE_URL`. It remains usable independently of Stripe configuration. Signed links additionally need a private dedicated `MARKETING_UNSUBSCRIBE_SECRET` of at least 32 random characters. See [.env.example](../.env.example) and [environment setup](deployment.md). No email-service key is needed and no website deployment is performed automatically.

## Verification

```sh
npm test
npm run test:integration
npm run lint
npm run typecheck
npm run build
```

Unit tests cover strict normalized inputs, token tampering/key validation, fragment-only URLs, editorial migration preservation and cleared-copy behavior. Real-Postgres integration tests cover paid-consent association, late/duplicate events, repeated withdrawals, a later explicit resubscribe, unchecked purchases, concurrent normalized-address opt-outs, constraints and transaction rollback/retry.

For browser verification, use a separate migrated `TEST_DATABASE_URL`, distinct from the app database. Build with the QA origin, start the dedicated QA server, and run only this suite:

```sh
NEXT_PUBLIC_SITE_URL=http://localhost:3001 npm run build
npm run unsubscribe:qa
# In another terminal:
UNSUBSCRIBE_QA=true PLAYWRIGHT_BASE_URL=http://localhost:3001 npm run test:e2e -- tests/e2e/unsubscribe.spec.ts
```

The server wires only the separate QA database. The suite seeds synthetic paid-consent records, exercises the actual page/API/database and removes its fixtures afterward. It verifies known/unknown/repeated address responses, mobile layout, unchanged order history, signed confirmation, read-only link visits, no analytics, invalid links/inputs, GET rejection and origin checks. It does not charge a card, send email or prove a new Stripe webhook delivery. Restore the ordinary `npm run build` afterward if using `next start` on port 3000; build-time origins cannot be changed by start-time environment alone.

If Playwright's bundled browser is unavailable, set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` to an installed Chromium executable, or install the matching browser before running the suite.

## Executed verification — November 7, 2026

- Migration `0003_chubby_hulk.sql` passed on the isolated Neon QA branch, then on the configured app database. All 20 real-Postgres integration tests passed, including the six new preference/withdrawal/transaction scenarios.
- All 79 unit tests passed. Lint, TypeScript and the production build passed with `/unsubscribe` and its API present in the route output.
- The final browser run passed all three scenarios (`3 passed (19.8s)`) against the dedicated port-3001 app and QA database with checkout disabled. The form wrote real opt-outs; signed links required explicit confirmation; invalid signatures, inputs and origins did not change the fixture's status. Invalid-link email fallback remained usable after validation errors. The suite removed its synthetic orders/preferences/pickup configuration afterward.
- Desktop (1440px) and mobile (390px) screenshots were visually checked against the existing cream/copper design. No storefront analytics script was mounted on the preference page.
- The private operator CSV included current subscription status and the latest withdrawal alongside historical consent, used mode 0600, and was removed after verification.
- The CMS migration initialized the new copy in both existing published/draft commerce documents and preserved other content. Its default rerun is idempotent. Shared footer navigation was preserved; the explicit `--include-navigation --dry-run` reports one pending post-deployment document, without publishing a broken link on the existing staged site.
- Local signing-secret generation displayed no value. No website deployment, live Stripe change, campaign delivery or provider enrollment was performed. Temporary QA server processes were stopped; the pre-existing port-3000 development server and Stripe listener were preserved.

Initial sandboxed network attempts could not reach Neon/Sanity and succeeded after network approval. Playwright's expected bundled Chromium was absent, so the existing installed Chromium was used. An initial browser assertion matched Next's additional route-announcer alert; the selector was scoped to the form's error element and the full suite passed afterward.
