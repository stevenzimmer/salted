# Manual launch menu and pickup Fridays

Launch ordering uses the published **Products → Active** and each **Size / variant → Active** switch in Sanity. All active sizes of active products are offered on every open Friday. Pricing, names, images and customer-facing copy remain in Sanity. There is no separate weekly menu or allocation to publish, no inventory initialization and no menu synchronization job.

Size radios and add-to-bag controls follow CMS activation only: active sizes stay selectable/addable when pickup dates are closed, and inactive sizes remain visible as disabled choices. Default selection follows the first active size in CMS order. Customers can build a bag and change quantities before a Friday is opened, subject to the existing 20-unit-per-line guard. The calendar and server checkout still require an eligible Friday for the complete bag. Inactive sizes are excluded from cart acceptance and advertised starting prices.

This behavior is covered by the 88-test unit suite (including active add-to-bag controls with empty pickup schedules, inactive sizes, default selection, cart exclusion and pricing) and a mobile Playwright bag flow (`1 passed (7.7s)`). With real published product flags and an explicitly empty availability response, the browser selected a size by keyboard, added two units, increased the bag to three, verified persisted quantities and confirmed that checkout offered no Friday/payment control. It created no order or payment. Lint, typecheck and the normal-origin production build also passed.

Stock quantity caps are intentionally disabled for launch, as approved on November 7, 2026. Active offerings use explicit `inventory: null` in availability responses; missing offerings still mean unavailable. The existing limit of 20 units per cart line and money/input validation remain. No low-stock counts are displayed for uncapped offerings. Future stock/capacity automation is deferred.

## Open and close Fridays

Use Node 24 and the intended environment's private database credentials. These commands are operator-only scripts, never public HTTP write endpoints:

```sh
npm run commerce:pickup -- list
npm run commerce:pickup -- open 2026-11-20
npm run commerce:pickup -- close 2026-11-20
```

Opening is idempotent. It creates or explicitly adopts one Friday with `configuration_source=manual` and enables it. A Friday must be in the future and before its Wednesday 11:59:59 PM Pacific cutoff. Pickup remains 2–6pm PT, with America/Los_Angeles DST calculations. An existing date with different hours/timezone/cutoff is rejected for operator review rather than silently changing an existing commitment. Closing a missing/already-closed Friday is harmless. Dates are never deleted by these commands.

Nothing opens future Fridays automatically. Only explicitly opened dates are offered, and the cutoff still applies even if a date's stored enabled flag remains true. List output identifies legacy versus manually managed dates. No customer contact details are printed.

Toggle products or sizes and publish to update the menu for all open Fridays. Publication changes new checkout eligibility; already-payable Stripe Sessions retain their original product/price/pickup commitment until paid or expired. Closing a Friday also stops new checkouts while allowing existing Sessions to settle. Contact customers or explicitly cancel/refund affected sessions using an approved operations workflow if an existing commitment cannot be honored.

## Migration and rollout

1. Test/apply committed Drizzle migration `0004_typical_darwin.sql` on an isolated QA branch, then the intended app database using `npm run db:migrate`.
2. Deploy the updated app/Studio only when authorized. No CMS data deletion or catalog seed migration is needed. The schema, Studio menu and creation templates no longer expose `weeklyMenu`; old documents are retained for historical compatibility with older deployments, but new code never reads them. Run `npm run cms:migrate-manual-menu-copy` to replace only the unchanged seeded cancellation label that mentioned releasing a hold; edited/cleared labels and draft status are preserved. Review other optional commerce copy before launch.
3. Stop any external legacy `commerce:sync` job. Verified webhooks handle payment notifications; manual operator commands cover reconciliation and expired rate-limit cleanup. Neither command opens Fridays or synchronizes menus/inventory. The old npm sync/QA-menu commands are retired.
4. After the updated app is in use, explicitly open the desired Fridays with the private command above. Existing legacy-enabled dates are not implicitly adopted. With no manually opened future Friday, new checkout availability is closed.
5. Review published product/size activation and test the cart/calendar/payment flow in sandbox mode. `COMMERCE_ENABLED` still controls payment creation. Read-only real availability is also used with payments off; mock fixture stock is never a storefront fallback.

Migration is additive and preserves orders, order items, contacts, consent, payment references, legacy inventory and active holds. Legacy `sanity_menu_id` / `sanity_revision` columns become nullable; manual dates need neither. `pickup_dates.configuration_source` defaults `sanity_legacy`, so old dates remain closed to new ordering until adopted. `checkout_attempts.inventory_mode` defaults `reserved` for all older attempts, while new creation explicitly writes `uncapped`.

## Checkout and old reservations

New checkout validates the current published catalog and prices, locks the selected manual Friday for shared reading, checks enabled/cutoff state, and persists a pending order, item snapshots and idempotent attempt in one transaction. There are no inventory inserts, reservations or sold-count changes for new uncapped orders. A concurrent manual close takes an exclusive update lock, so it cannot slip through the date validation transaction.

Stripe remains hosted Checkout with fixed USD integer cents, immediate card/wallet methods, approximately 32-minute Session expiration and verified/idempotent webhook fulfillment. Uncertain creation outcomes still reuse the same Stripe/database key and reconcile safely. Browser redirects cannot mark orders paid. Uncapped completion legitimately requires no reservation rows.

Old `reserved` attempts continue through the existing hold lifecycle: paid converts holds to sold exactly once, expiration/definitive failure releases unpaid holds, browser navigation alone releases nothing, and an old reserved attempt missing its hold cannot be mistaken for an uncapped order. Manual date operations never reset legacy capacity/sold/held counters. Refunds preserve financial state and order snapshots without restocking.

Operators still use `commerce:export` for accurate paid-order production totals. Because launch has no stock cap, the bakery must manage acceptance through product/size activation and opening/closing dates; an active offering will not sell out automatically.

## Verification

`npm test` covers active catalog filtering (including newly added sizes), explicit uncapped wire data, missing/disabled offerings, full-cart date intersection, Pacific/DST cutoff calculations, price integrity and the existing per-line quantity guard. `npm run test:integration` uses an isolated real Postgres database for concurrent uncapped checkout, retry/rollback, open/close locking, legacy reservation recovery, fulfillment/refund transitions and marketing preferences. External Stripe envelopes in that suite are synthetic; browser/CLI payment evidence is reported separately.

For isolated browser payment tests, use a distinct migrated `TEST_DATABASE_URL` and keep the existing app environment untouched:

```sh
NEXT_PUBLIC_SITE_URL=http://localhost:3001 npm run build
npm run stripe:listen -- 3001 /tmp/salted-manual-menu-webhook.env
# In another terminal after the listener connects:
node --env-file=.env.local --env-file=/tmp/salted-manual-menu-webhook.env --import tsx scripts/commerce-test-server.ts
# In a third terminal, using installed Playwright Chromium (or set its executable path):
MANUAL_MENU_QA=true PLAYWRIGHT_BASE_URL=http://localhost:3001 npm run test:e2e -- tests/e2e/manual-menu.spec.ts
```

The optional second listener argument writes the actual CLI signing secret to a private separate file, without overwriting an existing local listener's `.env.local` secret. Never use a placeholder secret. The QA server maps only the separate test database and enables test checkout without changing saved `COMMERCE_ENABLED=false`. Browser fixtures explicitly open two otherwise unused Fridays, then close only their dates and expire remaining test Sessions. Paid test orders/date references are retained for audit. No product or CMS menu documents are changed. Stop these temporary processes and restore `npm run build` with the ordinary origin afterward.

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
