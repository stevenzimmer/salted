# Pickup Fridays and CMS blackout dates

Future Fridays are available by default before their Wednesday 11:59:59 PM Pacific cutoff. Pickup stays 2–6pm PT. Published active products and active sizes form the menu, without stock caps. Customers can build a bag independently of pickup eligibility, subject to the existing 20-unit-per-line limit.

## Content manager workflow

Open **Studio → Pickup Info → Pickup blackout dates**. Add a date with its calendar picker, then **Publish** to close that Friday to new checkouts. Only valid Fridays are accepted; duplicate entries are rejected. Remove a date and publish to reopen it. An absent or cleared list means no blackout dates. Draft changes never close published checkout dates. Blackouts apply to the whole order, not individual products or sizes.

The storefront and checkout read the published list without CDN/Next caches. The open drawer refreshes availability on focus and every 15 seconds. A newly blacked-out selection loses payment eligibility without clearing the bag. All other future Fridays remain selectable, with no artificial final calendar month. Past dates, other weekdays, cutoffs, inactive offerings and invalid quantities remain unavailable. Fetch failures fail closed while keeping the calendar visible.

## Transactional ownership and rollout

Sanity owns the blackout list and active catalog, never orders or inventory. Postgres stores only dates needed for orders. New checkout validates the current published catalog, prices and blackout list, inserts the chosen date if absent, and locks its stored details inside the order transaction. Concurrent first checkouts share one date. No stock, hold, menu or pre-opened Friday rows are required.

Existing pickup source/enabled flags are historical and no longer gate ordering. Existing hours/timezone/cutoff commitments are preserved; conflicting details reject a new checkout for operator review. The existing database schema is sufficient; no database migration or bulk date rewrite is needed. Generated Sanity schema/types include the new optional field; no CMS seed/migration or document mutation is needed. Editors can add blackouts after the updated Studio is available.

Manual `commerce:pickup open/close` writes are retired and return guidance to Studio. `npm run commerce:pickup -- list` only inspects stored order dates; it is not the offered calendar. This rule supersedes the earlier manual-Friday launch decision.

A blackout affects new checkout creation after its published read. Sanity publication and Postgres transactions are separate systems; an already-created payable Session/retry keeps its original commitment. Verified payments, refunds and legacy reserved-hold recovery keep their existing lifecycle. No network calls run inside database transactions. Checkout defaults to Stripe and payment creation requires configured test keys.

## Verification

`npm test` covers default-open Fridays, distant future dates, cleared/absent/invalid blackout lists, whole-cart activation, quantities, and exact Pacific/DST cutoffs. `npm run test:integration` uses only a separate migrated `TEST_DATABASE_URL` for concurrent lazy date creation, blackout rejection, retry commitment preservation, stored-detail locking, legacy holds and payment/consent regressions. Stripe envelopes in this suite are synthetic.

The mobile browser regression is `tests/e2e/pickup-blackouts.spec.ts`: it checks the actual availability API uses recurring rules, navigates six months forward, and simulates published blackout/clear/fetch-failure responses without changing shared CMS content or creating payments. `tests/e2e/variant-selection.spec.ts` retains the empty-schedule recovery regression.

The opt-in `MANUAL_MENU_QA=true` payment suite retains its filename for compatibility, but now chooses default-open Fridays. Run it only against an isolated test server/database and official Stripe CLI forwarding. It creates real sandbox payments; it is separate from synthetic integration evidence. No payment creation or webhook delivery is implied by passing the default-open browser test.

## Historical evidence

The following results document the superseded manual-opening revision. Its operator opening/closing instructions are no longer current.

## Executed verification — November 7, 2026

- Migration `0004_typical_darwin.sql` passed on isolated Neon QA before application to the configured app database. Existing dates remain `sanity_legacy` pending explicit manual adoption; no application Friday was opened automatically.
- All 84 unit tests and 24 real-Postgres integration tests passed. The database suite includes 12 simultaneous uncapped orders with no stock/hold rows, closure locking, retries/rollback, unchanged legacy counters and legacy hold settlement/release, plus consent and unsubscribe regressions.
- Real browser payment: 20 units of Classic Focaccia / 8×8 completed hosted sandbox Checkout and returned to a verified confirmation showing `2–6pm PT` and an empty cart. Postgres recorded paid/confirmed with `inventory_mode=uncapped`, the correct integer-cent total and item quantity, zero inventory rows and zero reservations for that pickup/order.
- Official Stripe CLI forwarded `checkout.session.completed`, event `evt_1UZNNIETB3yZeGSHEbBd70Oh`, to the isolated port-3001 app with HTTP 200. The matching event ID was stored once in Postgres. This is actual webhook evidence, separate from synthetic integration envelopes.
- The manual-closure browser case passed on its corrected rerun (`1 passed (13.8s)`): fresh availability removed the payment control, the server rejected the closed Friday and the bag stayed saved. The initial assertion expected a disabled button; the preserved UI correctly displays the existing empty-calendar state and omits the payment control.
- The private CLI was also exercised end to end on a QA fixture: `pickup open 2026-11-20` returned enabled/uncapped; the actual availability API returned HTTP 200 with that Friday and explicit null stock. `pickup close` returned disabled and the API immediately omitted it. All four temporary QA Fridays ended closed; paid test orders were retained.
- Lint, typecheck and production build passed. Schema/type generation reports 14 queries / 38 schema types; the weekly-menu query/type are removed. The private pickup command listed only date/window/cutoff/source state, without customer details.
- The copy migration updated the exact old seeded cancellation label in two published/draft documents, preserving custom/cleared content and draft state. No CMS menu/catalog documents were changed or deleted. No website push/deployment, live Stripe changes, marketing sends or Phase 4 work were performed.
- Temporary port-3001 app/Stripe CLI processes were stopped and the normal-origin `npm run build` passed afterward. The existing port-3000 development server/listener, saved checkout-off flag and original webhook signing secret were preserved.
