# Phase 3 launch decisions

The repository implements test-mode commerce. Production activation remains explicitly unauthorized and is rejected by the Stripe client guard. `COMMERCE_ENABLED` defaults false.

Before a separate live activation change:

- Approve tax treatment for the products/location and any registrations. Automatic tax is currently off; do not interpret this as a tax exemption decision.
- Provide and approve the real pickup street address and arrival guidance. Current CMS guidance states that these await bakery confirmation; no address delivery is promised. A separate secure address-delivery mechanism is still needed if the address must remain private.
- Approve cancellation, refunds, missed pickup, fulfillment and contact workflows; set who monitors Stripe/webhook errors and how they recover exceptional paid-without-stock cases.
- Review draft ingredients, allergens, dietary claims, legal content, founder copy and all commerce wording. Existing draft notices remain.
- Launch decision: no stock caps, with published active product/size switches and default-open future Fridays before the Pacific cutoff. Editors publish holiday/other blackout Fridays in Pickup Info → Pickup blackout dates. Shared/per-variant capacity remains deferred.
- Assign an operator to investigate pending payments and use `commerce:reconcile` for missed notifications/interrupted creation. Rate-limit buckets older than 24 hours can be removed with `commerce:prune-rate-limits`. These commands run manually with private credentials.
- Use a clean, isolated live database/branch; the configured app branch currently contains synthetic sandbox orders retained for audit. Do not mix these with future customer orders.
- Decide contact retention, database backup/restore procedures, secure CSV storage and authorized operator access. A dashboard is intentionally deferred until authentication is designed; use the operator export script.
- Configure sandbox/production receipt and branding settings in the matching Stripe environment. Phase 4 owns branded Resend email and Twilio; this phase sends neither.
- Review restricted-key permissions (Checkout Sessions read/create/expire, PaymentIntents/charges read, account read for setup), webhook endpoint configuration and signing-secret rotation. Test and live keys must never be mixed.
- Recheck test cases and QA evidence in `stripe-webhook-testing.md` and `phase-3-verification.md` before declaring launch readiness. A passing build is insufficient.

Website deployment, Vercel environment changes, pushes and live account changes require an explicit request. No production payment activation, website deployment, customer accounts, special-order payments, shipping, subscriptions, gift cards, promotions, SMS or custom email are included.
