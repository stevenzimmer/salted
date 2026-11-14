# Phase 3 commerce architecture

Next.js 16 App Router Node route handlers run hosted Stripe Checkout and Drizzle transactions on Neon Postgres. The website, cart drawer, product selectors and shadcn calendar keep their existing layouts. Checkout defaults to Stripe without an enable flag and requires configured test keys. Read-only recurring pickup/catalog availability remains current independently of Stripe configuration. Draft Mode keeps the local preview flow and never offers paid checkout.

Sanity owns published catalog identities, active flags, names, variants, integer-cent prices customer-facing copy and published pickup blackout dates. Postgres owns lazily persisted order pickup dates, attempts, order/item snapshots, customer contacts, financial/order states and event IDs. Stock caps are disabled for launch. Historical inventory, holds and sync logs are retained for older reserved attempts. Stripe owns payment processing and payment notifications. Stripe does not become a catalog editor.

Authoritative catalog reads use centralized generated GROQ query types with an explicit published perspective, CDN disabled and `cache: no-store`. This intentionally bypasses `sanityFetch`'s editorial live cache for transaction validation. Displayed editorial content continues through the existing `defineLive` / `sanityFetch` integration with stega mapping preserved. Transactional names are clean published snapshots, never draft strings.

`src/db/schema.ts` defines schema and checks. Committed Drizzle migrations live in `drizzle/`. The Neon serverless WebSocket Pool supports interactive transactions and ordered row locks. A request-scoped pool closes after each operation. Application traffic uses pooled `DATABASE_URL`; migrations require direct `DATABASE_URL_UNPOOLED`. No secret or database module is imported into Client Components.

Checkout: strict Zod cart/date/key validation → fresh published active products/sizes and prices → explicit price review → default-Friday/blackout validation → one pickup/order transaction → immutable persisted Stripe parameters → Stripe request outside the transaction → attach Session → redirect. Stripe keys and all events must be test mode. Inline price data uses the current integer-cent snapshots. Card-only `allowed_payment_method_types` filters dynamic methods while retaining supported card wallets. Adaptive Pricing, shipping, promotions and automatic tax are disabled.

A random HttpOnly, SameSite=Lax browser capability is hashed into each checkout/order. Success reads require both this capability and the Session ID; they never expose contact details. Emailed order capabilities also authorize read-only access to one order through the confirmation flow described in [order emails](order-emails.md). Without either capability, the customer must contact the bakery; public order lookup remains unavailable. The success page is read-only and cannot fulfill an order. It clears a matching cart only when Stripe and Postgres both verify paid state. A newer, different cart is preserved. Abandoned Sessions expire through Stripe, and operators can reconcile uncertain or missed events; the storefront has no manual Session cancellation control.

Database rate limits bound guest attempts and Vercel-provided client IP requests per five-minute window. Raw IPs are never persisted. Keep Vercel's trusted forwarded header semantics and production firewall controls under review. Operators can delete rate-limit rows older than 24 hours using `npm run commerce:prune-rate-limits`. Browser closure does not release stock.

## Operator setup

1. Use Node 24 and `npm ci`. Keep all credentials in gitignored environment files.
2. The requested Neon project is linked locally via gitignored `.neon`; `neon.ts` declares Postgres only (`auth: false`). `neon deploy` applies infrastructure policy and pulls credentials; it does not migrate the commerce schema or deploy Vercel.
3. Test migrations on an isolated Neon branch, then run `npm run db:migrate` against the intended app branch. `npm run db:generate` creates future migrations; never use destructive schema push in production.
4. Run `npm run cms:migrate-commerce-copy` once with a temporary write token. It only initializes a missing checkout copy group and preserves existing groups (including cleared copy) and editorial drafts. Review this operational wording in Studio. If updating an already-initialized checkout group, set the optional Refresh label for the pending-state refresh control; migrations preserve existing groups rather than restoring cleared fields.
5. Apply existing committed migrations and publish active products/sizes. Future Fridays are available automatically before the cutoff. Publish closures in Studio → Pickup Info → Pickup blackout dates. Missing/cleared blackout lists close no dates. The retired `commerce:pickup open/close` commands reject writes; `list` inspects stored order dates only. No menu/inventory sync or additional database migration is needed. Run `npm run commerce:check` for connectivity. See [launch operations](manual-menu-launch.md).
6. Configure the private `RATE_LIMIT_SECRET` for checkout/unsubscribe rate limiting. Use `npm run commerce:reconcile` for operator recovery of interrupted creation or missed events, and `npm run commerce:prune-rate-limits` for expired request-bucket cleanup. Neither command has a public HTTP endpoint or runs automatically.

No database administration endpoint is public. Authorized operators use:

```sh
npm run commerce:export -- 2026-11-20 /private/operator/pickup-2026-11-20.csv
```

The script exports paid/partially refunded order items with order number, name/email/optional phone, integer-cent order/line totals and payment status. It prints a production summary by product and variant without contacts. The CSV refuses overwrites, uses mode 0600 and escapes spreadsheet formulas. Keep exports outside the repository and delete them according to the approved retention policy. Fully refunded orders are omitted from the production list; inspect financial records separately. An authenticated dashboard and fulfillment-status operations remain future admin work.

## Local verification

`npm test` checks pure business rules and real Stripe SDK signature verification. `npm run test:integration` requires `TEST_DATABASE_URL` pointing at a separate migrated QA database; it refuses the app URL. Integration tests exercise real Postgres locks, transactions and constraints, with synthetic Stripe envelopes only at the external boundary. `npm run test:e2e` exercises the live local app and sandbox Checkout; never run with live keys.

The former CMS QA-menu, synchronization and manual pickup opening/closing commands are retired. Use an isolated QA database for transaction tests. Existing legacy CMS documents are retained without runtime reads or writes, preserving older deployments during rollout.

## Newsletter consent extension

The cart drawer captures explicit optional marketing consent before Stripe redirects. `orders.marketing_opt_in` defaults false; opt-in stores timestamp/source/wording/hash evidence and is later associated with the verified Stripe guest email. Consent participates in checkout idempotency and is never inferred from payment. See [marketing consent](marketing-consent.md).

`marketing_subscriptions` stores current per-email status and withdrawals. A verified opted-in payment updates this table inside the same fulfillment transaction, only if its consent is newer than the recorded consent and withdrawal. Public `/unsubscribe` changes current status without editing orders and remains available independently of Stripe configuration. Its separate root layout excludes storefront analytics/cart providers. Operator CSVs distinguish historical consent from current subscription status. Newsletter delivery remains future work; see [unsubscribe setup](unsubscribe.md).

New attempts explicitly persist `inventory_mode=uncapped` and create no inventory/reservation rows. Existing attempts default to `reserved` and retain strict stock fulfillment/release checks. New checkout reads the published blackout list without caches before the transaction. It inserts only the chosen pickup date if absent and locks its stored details, preserving existing commitments. Legacy source/enabled flags do not govern eligibility; existing conflicting hours/timezone/cutoffs require review. Sanity publication and Postgres are separate systems: blackout changes govern new requests after their published read, while already-payable Sessions and retries retain their commitment. Verified webhooks handle payment/refund notifications. Operator-only commands provide manual reconciliation and rate-limit cleanup; they do not open dates or update catalog/inventory configuration.

The explicitly requested transactional email extension queues customer and business confirmations in the paid-order transaction. Postgres owns delivery records; Resend sends separately after commit. Duplicate webhooks and private reconciliation recover pending delivery. Success-page reads remain read-only. See [setup and recovery](order-emails.md).

The requested [special-order form activation](special-orders.md) saves independent bakery-review requests in Postgres, captures optional newsletter consent against published wording, and queues a bakery notification. It creates no paid order, payment or reservation. Current subscriptions can reference affirmative consent from either a paid checkout or a special-order request; retries preserve later withdrawals.
