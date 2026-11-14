# Special-order requests

The special-order form submits real requests to `POST /api/special-orders`. Postgres stores contact details, the requested calendar date, the combined products/quantities/occasion/notes text, and any affirmative newsletter consent in `special_order_requests`. These are bakery-review requests, separate from paid `orders`; they create no payment, stock hold or approval. The configurable five-calendar-day Pacific lead time remains in effect.

The server validates bounded inputs, calendar dates and lead time. It requires the configured website origin and uses a separate purpose-specific rate-limit bucket (30 requests per five minutes, trusted Vercel client header, hashed with `RATE_LIMIT_SECRET`). Responses include only result codes, never contact details or subscription status. There is no public customer-data read endpoint. Do not put request data in analytics or logs.

The browser keeps a random request key in memory for an unchanged submission. Database uniqueness and a content fingerprint deduplicate concurrent and uncertain retries. Changed content needs a new key. A saved retry acknowledges the original request without replaying consent or revalidating an old date/wording. Reloading the page starts a new form attempt; contact data is not stored in the browser.

## Optional newsletter consent

The checkbox shares **Commerce Copy → Marketing Consent → Label** with checkout. It is optional, unchecked and omitted when its wording is cleared. Affirmative submissions must match the current published CMS wording. The request stores its timestamp, exact accepted text, SHA-256 version and `special_order_form` source.

The same transaction saves the request and updates `marketing_subscriptions`, linking `last_consent_special_order_id` to the request. Unchecked submissions leave existing preferences alone. New affirmative requests can resubscribe only when their consent is newer than both the current consent and latest withdrawal. Saved retries cannot undo an unsubscribe. Paid checkout keeps its existing verified-payment requirement and clears the special-request association when newer checkout consent wins. Future marketing senders must still check current preferences immediately before sending. This feature sends no marketing email and synchronizes no provider mailing list.

## Bakery notification and recovery

After the request commits, Next.js `after()` attempts a React Email/Resend notification to **feedme@saltedfocaccia.com**, with the customer as Reply-To. It includes the saved name, email, phone, requested date, combined request details and consent choice. Only the bakery receives this notification. **Special Orders → Notification Email** owns its editable wording. The message's data always comes from the saved request.

The request itself is the durable notification outbox. A database lease serializes sends; the rendered HTML/plain-text payload is persisted before the provider call and reused with `salted-special-order/<request-id>`. Sent requests stay sent. Provider/configuration failures leave the saved request pending and do not show a false form failure. Recover privately after configuring email:

```sh
npm run special-orders:retry-emails
```

No scheduled jobs or public maintenance endpoints are added. Resend keeps idempotency keys for [24 hours](https://resend.com/docs/dashboard/emails/idempotency-keys); ambiguous attempts at least 23 hours old move to `review` and require operator investigation before another send. Never reset an uncertain delivery blindly. The notification payload contains personal data and needs the same private access/retention controls as the request. Provider acceptance does not prove inbox delivery.

## Setup and verification

1. Generate changes with `npm run db:generate`. Run `npm run db:migrate-test` and `npm run test:integration` on a separate QA branch before `npm run db:migrate` against the intended application database. Migration `0006_loose_tusk.sql` adds the request table and extends the subscription association without changing existing orders or preferences.
2. Run `npm run cms:activate-special-orders -- --dry-run`, then `npm run cms:activate-special-orders`. The revision-guarded migration replaces only known seeded preview wording, initializes missing status/email copy and preserves custom/cleared content and draft status. Review custom copy for any remaining preview language. Seed files are migration artifacts, never runtime fallbacks.
3. Configure `DATABASE_URL`, direct `DATABASE_URL_UNPOOLED` for migrations, `RATE_LIMIT_SECRET`, Sanity read settings and the correct `NEXT_PUBLIC_SITE_URL` origin. Configure server-only `RESEND_API_KEY` for a verified sending domain and `EMAIL_FROM` (default `feedme@saltedfocaccia.com`). Requests can save while the sending key is absent; notifications stay pending until private recovery runs.
4. Run `npm run lint`, `npm run typecheck`, `npm test` and `npm run build`. The integration suite verifies real database persistence, concurrent retries, consent/withdrawal ordering, sender failures, stable payloads, delivery leases and review state with a fake provider. It does not prove real inbox delivery.

Deployment and hosted environment changes remain separate explicitly requested actions.

For real browser/database verification without sending any email:

```sh
NEXT_PUBLIC_SITE_URL=http://localhost:3001 npm run build
npm run special-orders:qa
# In another terminal:
SPECIAL_ORDERS_QA=true PLAYWRIGHT_BASE_URL=http://localhost:3001 npm run test:e2e -- tests/e2e/special-orders.spec.ts
```

The QA server refuses the app branch and explicitly disables Resend sending. The browser suite uses synthetic contacts, checks mobile layout, optional keyboard consent, real request persistence, lost-response retries, withdrawal protection and API boundaries, then removes its request/preference fixtures. Restore `npm run build` for the ordinary configured website origin afterward.

## Executed verification — November 14, 2026

- Generated migration `0006_loose_tusk.sql`, applied it to the isolated QA branch, and passed all 34 real-Postgres integration tests before applying it to the configured application database.
- The revision-guarded Sanity migration updated one special-order document, preserving custom copy and draft status.
- All three browser scenarios passed on the isolated port-3001 QA server (18.2 seconds), with real database writes and Resend explicitly disabled. They checked unchecked and affirmative submissions, keyboard consent, mobile width, lost-response deduplication, later unsubscribe protection, unsafe origins, oversized/invalid input, and stale consent. Request/preference fixtures were removed.
- All four new unit tests pass. The full unit run has 107 passes and one existing unrelated failure in the hero-image wrapper test, caused by the already-modified wordmark image. Lint passes with existing warnings; TypeScript and the production build pass.
- Provider behavior was exercised through an injected test sender. `RESEND_API_KEY` is absent and the user chose to configure it later, so no real email or inbox delivery was verified. New requests remain durable with pending notifications until configuration and private recovery.
- No website deployment, push, hosted environment update or live Stripe change was performed.
