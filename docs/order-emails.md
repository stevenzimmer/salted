# Paid order confirmation emails

The requested transactional email extension uses Resend and React Email. A verified paid Stripe Session atomically queues two `order_emails` records in the payment transaction. One goes to Stripe’s verified customer email; the other goes to `feedme@saltedfocaccia.com`. Both are sent from `feedme@saltedfocaccia.com`. The business copy also includes saved customer contacts. Each recipient has a separate delivery record and provider idempotency key.

Emails include the saved order number, items, sizes, quantities, totals, immutable pickup date/window in local time, without timezone labels, published pickup guidance, the actual Stripe charge’s receipt URL, and a secure link opening `/order/success`. No address, policy or dietary claims are invented. `email-wordmark.png` is derived from the requested `hero-wordmark.svg` on the cream background for email compatibility. The SVG is unchanged.

Customer emails additionally show the owner-approved **4528 Mountaingate Dr, Rocklin, CA** and supplied Google Maps directions link. Edit **Pickup Address**, **Pickup Directions Label**, **Pickup Directions Url**, and optional **Pickup Guidance** in Commerce Copy → Order Email. Customer arrival guidance comes from that email-specific slot rather than the public checkout’s address-awaiting-confirmation placeholder. Clearing individual fields removes them; no address or directions appear in the business copy. Website client props include only the confirmation-access labels from this group, not email-only pickup details. Previously persisted delivery payloads remain immutable on retries.

## Configuration

1. Run `npm run db:migrate-test`, then `npm run test:integration` with a separate `TEST_DATABASE_URL`. QA migration normalizes pooled/direct hostnames, refuses the app branch, and uses a direct QA connection. After verification, use `npm run db:migrate` with the intended app branch’s direct `DATABASE_URL_UNPOOLED`.
2. Run `npm run cms:migrate-order-email`. It initializes an absent **Commerce Copy → Order Email** group or missing approved pickup fields in an existing nonempty group, preserving published and draft wording, including cleared groups/fields. Review and publish later edits in Studio. Sending reads published CMS copy without draft/stega data; cleared fields disappear without seed fallbacks. Retries use persisted wording.
3. Verify `saltedfocaccia.com` in Resend using its DNS records. Set server-only `RESEND_API_KEY`, `EMAIL_FROM=feedme@saltedfocaccia.com`, and `ORDER_NOTIFICATION_EMAIL=feedme@saltedfocaccia.com`. Set a dedicated stable `ORDER_CONFIRMATION_SECRET` of at least 32 random characters. Local setup generated it in gitignored `.env.local`; configure each hosted environment independently.
4. Set `NEXT_PUBLIC_SITE_URL` to the public HTTPS website origin before building. The logo at `/images/brand/email-wordmark.png` and confirmation link use it. Localhost images/links are only usable locally.
5. Disable Resend link/open tracking for the sending domain so signed links are not rewritten. Confirm inbox delivery with authorized test recipients after setup. Stripe test mode does not simulate Resend sending. The existing Stripe test-key guard remains; live payment activation and deployment are separate explicitly requested changes.

See [Resend idempotency](https://resend.com/docs/dashboard/emails/idempotency-keys), [Resend domains](https://resend.com/docs/dashboard/domains/introduction), and [Stripe receipt URLs](https://docs.stripe.com/receipts#receipt-urls). Stripe receipt links expire after 30 days; Stripe handles requesting a replacement link.

## Delivery and recovery

Webhooks await delivery after payment commits. Missing configuration or provider failure returns HTTP 503 for Stripe to retry. Duplicate event IDs still attempt outstanding emails; sent copies stay sent. Failure never undoes payment. Success-page reads send nothing. Checkout recovery can queue notifications; the next webhook or private reconciliation dispatches them.

Persisted payloads and short database leases serialize workers without network calls inside transactions. A stable key and identical payload cover uncertain provider responses. `npm run commerce:emails` retries pending delivery privately; `npm run commerce:reconcile` recovers payments then retries emails. No scheduled jobs or public maintenance endpoints are added. Historical paid orders are not backfilled. Fully refunded orders do not send outstanding confirmations.

Resend retains idempotency keys for 24 hours. Ambiguous attempts older than 23 hours move to `review` instead of risking duplicates. An authorized operator must investigate `salted-order/<order_emails.id>` in Resend. If accepted, record its provider ID and sent timestamp. Reset the state/attempt timestamp only after definitive absence is established. Never blindly retry an ambiguous send. Outbox payloads contain customer information, receipt links and order capabilities; apply order-data access and retention rules. `sent` means provider acceptance, not proof of inbox delivery. Provider delivery/bounce webhooks and an admin interface are deferred.

## Confirmation access

An HMAC-signed order capability lives in the email URL fragment. `/order/open` has a separate root layout without analytics or third-party scripts. Same-origin POST exchanges the fragment for an HttpOnly, SameSite=Lax cookie scoped to `/order/success`, then opens that existing page. Session IDs alone and tampered capabilities never authorize access. The success page checks local and Stripe payment states, exposes no contacts, and performs no fulfillment.

Email access authorizes only one order, grants no checkout ownership, and never clears a cart. Original-browser Stripe redirects retain matching-cart clearing. Confirmation routes use no-referrer/noindex headers. Tokens and provider responses are excluded from application logs and analytics. Rotating the signing secret revokes earlier links.

## Verification

Unit tests cover token tampering, secure receipt domains, escaping, Pacific pickup windows, totals, links, contact separation, optional CMS fields and migration preservation. Postgres integration tests cover atomic enqueue, duplicate events, separate recipient recovery, immutable payload/key reuse, concurrency, paid-state preservation after delivery failure, receipt verification and the retention boundary. Provider responses are synthetic; these checks do not prove real webhook or inbox delivery.

Implementation verification: build and typecheck passed; lint passed with six existing warnings. All 30 isolated Postgres integration tests passed. The unit suite passed 103/104 tests, including all five email tests; the existing CMS hero-image test fails because the pre-existing working-tree wordmark edit adds an image. That edit was preserved. Mobile previews loaded the PNG and showed no horizontal overflow for either audience. The order-link entry page contained no analytics, and invalid tokens returned HTTP 400. The additive migration was applied to QA and the configured app database; the missing Sanity email group was initialized. No real email was sent; Resend configuration and inbox verification were deferred at the user’s request.

`npm run email:preview` writes synthetic customer/business HTML previews to `/tmp/salted-email-preview`. To view them, serve that directory locally on port 8766. Preview fixtures are never runtime content fallbacks.
