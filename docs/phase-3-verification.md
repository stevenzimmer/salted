> Historical evidence below covers the earlier capped-menu implementation. The approved uncapped/manual-date launch revision and its current verification are recorded in [manual launch operations](manual-menu-launch.md).

# Phase 3 verification evidence

Verification is against a local production build and the connected **salted sandbox**, with Neon project `spring-glitter-05463559`. No website deployment/push or live Stripe account change was performed. Saved `COMMERCE_ENABLED=false` remains the default.

## Infrastructure and build

- `npm i -g neon@latest`: the sandbox DNS attempt failed; retry with network permission succeeded.
- Requested `neon init -y --org-id org-muddy-bread-32594815 --project-id spring-glitter-05463559 --branch production --services postgres`: first sandbox attempt could not reach the API; network-enabled retry linked production, created `neon.ts`, and pulled pooled/direct URLs. The CLI also installed its user-level agent tooling and minted an account-scoped MCP API key as part of its default setup. No secret keys or database credentials were printed or committed. A browser frame diagnostic included Stripe’s public sandbox publishable key in an iframe URL; later diagnostics avoided full frame URLs.
- `neon deploy`: **No changes — branch production already matches the policy. Utilized services: Postgres. Pulled 5 Neon variables into .env.local.**
- Drizzle migrations were applied to isolated QA branch `phase3-qa`, tested, then applied to the requested application branch. The QA branch expires November 14, 2026; `TEST_DATABASE_URL` must be refreshed if it is recreated.
- `npm run commerce:check`: `{"databaseConnected":true,"inventoryRows":17}` with a successful menu-sync record during QA.
- `npm run build`: successful webpack compilation, TypeScript and route generation. Built app was started on port 3001 to preserve an existing port-3000 dev server.

A runtime check caught bundled `ws` optional-addon failure (`mask is not a function`) despite a passing build. `next.config.ts` now externalizes `@neondatabase/serverless` and `ws`; the rebuilt app's availability endpoint returned HTTP 200 and actual Neon inventory. Checkout's build-time canonical origin must match the test/hosted origin; a port mismatch correctly returned HTTP 403 until the build used the matching site URL.

## Actual sandbox payment and webhook

The existing homepage → product selection → cart Sheet → shadcn calendar → hosted Stripe Checkout flow completed with Stripe's 4242 test card.

- Pickup: November 20, 2026, 14:00–18:00 Pacific.
- Order `SF-7DBEA0AA94E2`: Classic Focaccia / 6-inch Round, one unit, 700 cents.
- Stripe CLI output: `checkout.session.completed [evt_1UZIAyETB3yZeGSHjGgagb7z]` followed by **HTTP 200** from `POST http://localhost:3001/api/stripe/webhook`.
- Neon query: `payment_status=paid`, `order_status=confirmed`, `total=700`, customer name/email fields present (values omitted), one processed-event record.
- Inventory: Round `capacity=8`, `reserved=0`, `sold=1`.
- Browser returned to `/order/success?session_id=…`, showed the verified order number/items/total/Friday/window and storage link, exposed no contact details, and displayed **Open cart, 0 items**.
- Operator CSV export succeeded outside the repository with one paid order/line and production summary `Classic Focaccia / 6-inch Round: 1`.

The sandbox hosted UI initially surfaced Link bank options even though the Session API reported `allowed_payment_method_types=[card]` and `payment_method_types=[card]`. The final implementation also sets `wallet_options.link.display=never` to keep the inventory lifecycle restricted to immediate card/wallet payments without changing account resources.

## Automated checks

Unit, database and browser checks are separate evidence. Database tests use real Neon transactions/locks/constraints; synthetic Stripe envelopes and injected SDK failures cover only the external boundary. Real webhook delivery is evidenced above, not inferred from those tests.

- `npm run lint`: passed, no warnings.
- `npm run typecheck`: passed.
- `npm test`: 69 passed, zero failures/skips.
- `npm run test:integration`: 11 passed, zero failures/skips, against real Neon QA branch. Last-unit race, idempotent checkout/fulfillment, transaction rollback, release/paid protection, unpaid completion, unsafe sync rollback/increase, mismatched totals/event rollback, refunds, SDK rejection vs unknown network, cutoff/disabled/stale revision, and multi-variant quantities.
- Playwright: five scenarios passed across the verification runs: real card payment + verified return/cart clearing; decline + return/cart preservation + explicit cancellation; unverified success; invalid cart/changed prices/invalid signature; real 3D Secure authentication + verified return. Initial test selectors assumed “Test mode” rather than Stripe's observed “Sandbox” and a narrower decline message; corrected selectors then passed. The successful final two-scenario rerun reported `2 passed (52.3s)`.
- Actual 3D Secure test challenge was displayed and completed. Order `SF-9C6052573212` confirmed at 1300 cents. Event `evt_1UZIG2ETB3yZeGSHA5DVyDki` reached the app with HTTP 200.
- Actual declined-card return preserved the cart. Explicit cancellation returned HTTP 200; real expiration events `evt_1UZIHpETB3yZeGSHwlcrIL5F` and `evt_1UZIHsETB3yZeGSHqAbhuwtE` were forwarded by Stripe CLI and handled with HTTP 200.
- A replay script sent the already-handled real event, a signed stale expiration for its paid Session, and an invalid signature through the actual HTTP route: `{"duplicate":200,"invalidSignature":400,"outOfOrder":200,"paidOrderAndInventoryUnchanged":true}`. The stale envelope is intentionally synthetic; current payment state is retrieved from Stripe. No claim of an actual out-of-order Stripe delivery is implied.
- `npm run commerce:reconcile`: `{"reconciled":2,"failed":0}`. Open abandoned Sessions retained their holds while still payable.

## Remaining hosted/manual acceptance

The staged site was not redeployed or tested for hosted checkout, since website deployment was not authorized. Configure separate Vercel environment values, a real hosted sandbox webhook, then authorize deployment and repeat the same flow. Receipt emails/branding require Dashboard setup; no custom messages were sent.

Automatic wall-clock expiration was not observed by waiting 32 minutes; the actual Stripe expire API, real forwarded expiration events and reservation-release tests covered the terminal Session state. Unknown-creation network outcomes and database failures were injected at the API boundary/transaction boundary against real Postgres; a real infrastructure outage was not induced. Missed-webhook recovery queries were run against actual Stripe Sessions, but a paid webhook was not intentionally suppressed. These limits do not substitute for hosted operational acceptance.

Temporary operational QA menu and unpaid Session holds are cleaned after testing. Paid sandbox orders remain in the requested app branch for audit; use an isolated clean live database/branch before a future live launch. No editorial products or existing draft copy were changed by temporary QA fixtures.

Cleanup verification: `{"activeAttempts":0,"inventory":{"reserved":0,"sold":4},"dates":[{"date":"2026-11-20","enabled":false}],"paidOrders":4}`. Four synthetic paid sandbox orders remain; no active holds remain.

Production-dependency audit: `npm audit --omit=dev` reported 14 moderate advisories, zero high/critical, in the existing Sanity/CLI dependency chain (including minimatch). npm's suggested automated remediation would downgrade major Sanity/next-sanity versions, so it was not applied during the commerce implementation. Review/update that chain separately before live launch.
