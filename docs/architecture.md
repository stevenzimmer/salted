# Integration boundaries

The typed local catalog is the current read model. Server Component routes read content from `src/data`; commerce rules live in `src/lib`. Future adapters should return the same clear product/recipe models rather than embed CMS queries inside visual components.

## One order, one pickup date

An order owns exactly one pickup date. A cart line is `{ productId, variantId, quantity }` and must never gain a pickup-date field. Checkout finds the intersection of available dates for the complete cart, including quantities. Two Fridays require two orders.

`validPickupDates` currently operates over typed mock rows. A production endpoint must revalidate the full bag, server-owned prices, cutoffs, and capacity. Browser validation and local storage are convenience features, never authoritative production state.

## Editorial ownership

Sanity will own products, approved ingredients/allergens, photos, recipes, reviews, policies, homepage blocks, settings, menu publication, and possibly published pickup dates. Draft content must remain identifiable until approved. Sanity will not store authoritative completed orders.

## Transactional ownership

Neon Postgres with a future Drizzle schema will own orders, immutable order-item snapshots, payment status, inventory, reservations, special-order state, and notification delivery state. Production inventory needs atomic capacity checks, reservation expiry, idempotent checkout, and concurrency handling; none is simulated as a guarantee here.

## Payment ownership

Stripe session creation will run on the server. Verified, idempotently handled webhook events will be authoritative for payment completion. The success route must eventually read verified server order state and must never infer payment from its URL or browser storage. Today it always displays an explicitly labeled preview and does not clear the bag.

## Messaging ownership

React Email and Resend are reserved for future email. Twilio is reserved for optional-consent transactional SMS. The intended email sender is `feedme@saltedfocaccia.com`. No messaging SDK, template, or service is active. Future reminder work must use verified paid orders and explicit SMS consent.

## Time and mock behavior

Pickup date keys are Pacific calendar dates. Cutoffs are explicit offset-bearing instants generated using the configured timezone, including daylight-saving changes. Calendar display uses local date objects constructed from the date key so browsers in other timezones do not shift a Friday to Thursday. Server output carries the same mock schedule to interactive components to avoid mismatched inventory fixtures at hydration.

The root renders dynamically so the schedule follows the actual current Pacific date. A long-open tab still rechecks current cutoffs before proceeding. The future implementation should refresh authoritative availability and display a recoverable message when a date or quantity becomes unavailable.
