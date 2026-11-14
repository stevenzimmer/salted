# Phase 3 launch decisions

The repository implements test-mode commerce. Checkout defaults to Stripe without an enable flag. Production activation remains explicitly unauthorized and is rejected by the Stripe client guard. Draft Mode keeps the local preview flow.

Before a separate live activation change:

- Approve tax treatment for the products/location and any registrations. Automatic tax is currently off; do not interpret this as a tax exemption decision.
- The owner approved 4528 Mountaingate Dr, Rocklin, CA and a Google Maps directions link for customer confirmation emails. These are editable in Commerce Copy → Order Email. Additional arrival instructions still await approval; the customer email has its own optional Pickup Guidance field. Public pickup-page guidance remains separately editorial.
- Approve cancellation, refunds, missed pickup, fulfillment and contact workflows; set who monitors Stripe/webhook errors and how they recover exceptional paid-without-stock cases.
- Review draft ingredients, allergens, dietary claims, legal content, founder copy and all commerce wording. Existing draft notices remain.
- Launch decision: no stock caps, with published active product/size switches and default-open future Fridays before the Pacific cutoff. Editors publish holiday/other blackout Fridays in Pickup Info → Pickup blackout dates. Shared/per-variant capacity remains deferred.
- Assign an operator to investigate pending payments and use `commerce:reconcile` for missed notifications/interrupted creation. Rate-limit buckets older than 24 hours can be removed with `commerce:prune-rate-limits`. These commands run manually with private credentials.
- Use a clean, isolated live database/branch; the configured app branch currently contains synthetic sandbox orders retained for audit. Do not mix these with future customer orders.
- Decide contact retention, database backup/restore procedures, secure CSV storage and authorized operator access. A dashboard is intentionally deferred until authentication is designed; use the operator export script.
- Configure sandbox/production receipt and branding settings in the matching Stripe environment. The explicitly requested transactional Resend extension is documented in [order emails](order-emails.md); Twilio/SMS and other Phase 4 work remain deferred.
- Review restricted-key permissions (Checkout Sessions read/create/expire, PaymentIntents/charges read, account read for setup), webhook endpoint configuration and signing-secret rotation. Test and live keys must never be mixed.
- Recheck test cases and QA evidence in `stripe-webhook-testing.md` and `phase-3-verification.md` before declaring launch readiness. A passing build is insufficient.

Website deployment, Vercel environment changes, pushes and live account changes require an explicit request. No production payment activation, website deployment, customer accounts, special-order payments, shipping, subscriptions, gift cards, promotions or SMS are included. Paid-order confirmation emails and [special-order request submissions with bakery notifications](special-orders.md) are the requested scoped messaging extensions.
