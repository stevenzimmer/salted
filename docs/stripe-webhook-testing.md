# Stripe and webhook testing

Use a Stripe sandbox or test keys only. The implementation rejects live keys/events. This repository used the official Stripe plugin planner and the connected **salted sandbox**; no fallback was required and no live account resources were changed.

## Local setup

1. Set matching test `STRIPE_SECRET_KEY` and optional `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, the pooled/direct Neon URLs, `NEXT_PUBLIC_SITE_URL=http://localhost:3000`, and a random 32+ character `RATE_LIMIT_SECRET`. Hosted redirect does not need the publishable key in browser code.
2. Migrate the intended database, initialize the missing commerce copy group once, publish active products/sizes, and choose a future Friday that is not blacked out under Studio → Pickup Info → Pickup blackout dates. No manual opening is needed.
3. Install the current official Stripe CLI (`npm install -g @stripe/cli`). Authenticate to the correct sandbox or use the test API key through its environment; never pass secret values in committed commands/logs. Run:

   ```sh
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```

   Use the **actual** signing secret printed by this listener as local `STRIPE_WEBHOOK_SECRET`. The helper `npm run stripe:listen -- 3000` uses the official CLI, forwards only handled event types, and writes its actual signing secret privately into `.env.local` without displaying it. Start/restart the app after the helper connects.

4. Start the app with `npm run dev`. Checkout defaults to Stripe and requires the configured sandbox test key; no enable flag is needed. For port 3001, change the site origin, start with `--port 3001`, and forward to that port.
5. Browse the existing homepage, select flavor/size/quantity, add to the drawer, choose an available Friday and continue to Stripe. No `/cart` page is involved.

Use `4242 4242 4242 4242` for success, `4000 0000 0000 0002` for decline, and `4000 0025 0000 3155` for authentication-required. Use a future expiry, any test CVC and synthetic contact details. Complete authentication in the Stripe test modal. Never enter real card/customer data for QA.

## Evidence and state checks

A webhook check passes only when the CLI reports forwarding the event to this application with HTTP 2xx and the associated Postgres order/holds change correctly. `stripe trigger` creates unrelated fixtures and does not establish fulfillment of a Salted checkout. See `phase-3-verification.md` for executed results and limitations.

- Paid Session: one existing uncapped order becomes paid/confirmed exactly once without inventory/reservation writes, actual customer name/email are captured, and the capability-protected success page confirms it. Cart clears only after verification.
- Decline/authentication: no paid order until successful settlement. Retrying within the Session does not create a second order.
- Return/back/abandon: cart remains; the pending attempt remains while Stripe is payable. End the prior checkout explicitly to expire it. Legacy reserved holds remain until confirmed expiration. Closing a tab alone does not cancel.
- Expiration: expire the matching test Session, observe forwarded expiration, and verify the cancelled pending order. Legacy reserved attempts also release holds once.
- Duplicate/out-of-order delivery: replay matching signed events, or resend via the sandbox Dashboard/CLI. No duplicate order/fulfillment and no downgrade from paid. Current Session state is fetched before application.
- Invalid signature: POST unsigned/altered raw JSON to `/api/stripe/webhook`; expect 400 and no database writes. Use the exact raw body for SDK signing tests.
- Lost webhook: run `npm run commerce:reconcile`; actual Stripe state repairs pending orders. Unknown creation attempts remain recoverable under the same idempotency key; legacy holds remain until a Session is recovered or absence is proved.
- Pricing: change a cart's observed review price / a temporary test catalog, expect current server prices and explicit review before creating a Session. Never edit real editorial product prices just for QA.
- Product/size disabled, published blackout date, invalid Friday or cutoff: reject before Session creation, preserve the cart and identify unavailable items. Use isolated database tests for cutoff, blackout and legacy hold cases.
- Transaction/API errors: roll back local creation before commit; after uncertain Stripe creation retain the attempt (and any legacy hold) and retry with the same key. Test definitive Stripe creation rejection and recovery separately.

Run `npm test`, `npm run test:integration` against a separate migrated `TEST_DATABASE_URL`, and `npm run test:e2e` against the locally running sandbox-enabled app. Playwright needs a Chromium installation (`npx playwright install chromium`) or `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` pointing at an installed Chromium. Set `PLAYWRIGHT_BASE_URL` if using another port. Payment tests create real test Sessions/orders; expire/reconcile them afterward. Never alter shared editorial blackout dates just for QA. No CMS menu fixture or stock allocation is needed.

## Later hosted endpoint

For an explicitly authorized staged deployment, create a **sandbox** webhook endpoint at `https://<staged-origin>/api/stripe/webhook` with these events: `checkout.session.completed`, `checkout.session.expired`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `charge.refunded`. Use its endpoint signing secret in that Vercel environment; a CLI secret is local only. Allow this route through Vercel deployment protection using a narrowly scoped routing/protection configuration so Stripe can reach it; do not make a customer-data dashboard public.

Later production needs a distinct **live** endpoint and live signing secret, matching Stripe API/SDK compatibility, approved receipts/branding/payment settings and a separately approved code change removing the test-only guard. Never reuse the sandbox or CLI secret for production.

Local signed replay helper (test-only, localhost-only):

```sh
node --env-file=.env.local --import tsx scripts/commerce-webhook-qa.ts http://localhost:3000 <handled-test-event-id>
```

This retrieves the real event, posts a duplicate plus a deliberately stale signed expiration through the real handler, rejects an invalid signature, and compares real database order/inventory state before and after. It never prints keys or customer contacts. Its synthetic stale envelope is distinct from an actual delayed Stripe delivery.
