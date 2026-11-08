# Phase 3 commerce architecture

Next.js 16 App Router Node route handlers run hosted Stripe Checkout and Drizzle transactions on Neon Postgres. The website, cart drawer, product selectors and shadcn calendar keep their existing layouts. `COMMERCE_ENABLED=false` disables payment creation; read-only manual pickup/catalog availability remains current. Draft Mode never offers paid checkout.

Sanity owns published catalog identities, active flags, names, variants, integer-cent prices and customer-facing copy. Postgres owns manually opened pickup Fridays, attempts, order/item snapshots, customer contacts, financial/order states and event IDs. Stock caps are disabled for launch. Historical inventory, holds and sync logs are retained for older reserved attempts. Stripe owns payment processing and payment notifications. Stripe does not become a catalog editor.

Authoritative catalog reads use centralized generated GROQ query types with an explicit published perspective, CDN disabled and `cache: no-store`. This intentionally bypasses `sanityFetch`'s editorial live cache for transaction validation. Displayed editorial content continues through the existing `defineLive` / `sanityFetch` integration with stega mapping preserved. Transactional names are clean published snapshots, never draft strings.

`src/db/schema.ts` defines schema and checks. Committed Drizzle migrations live in `drizzle/`. The Neon serverless WebSocket Pool supports interactive transactions and ordered row locks. A request-scoped pool closes after each operation. Application traffic uses pooled `DATABASE_URL`; migrations require direct `DATABASE_URL_UNPOOLED`. No secret or database module is imported into Client Components.

Checkout: strict Zod cart/date/key validation → fresh published active products/sizes and prices → explicit price review → one manual-Friday/order transaction → immutable persisted Stripe parameters → Stripe request outside the transaction → attach Session → redirect. Stripe keys and all events must be test mode. Inline price data uses the current integer-cent snapshots. Card-only `allowed_payment_method_types` filters dynamic methods while retaining supported card wallets. Adaptive Pricing, shipping, promotions and automatic tax are disabled.

A random HttpOnly, SameSite=Lax browser capability is hashed into each checkout/order. Success reads require both this capability and the Session ID; they never expose contact details. Losing the cookie requires contacting the bakery; public order lookup is deliberately unavailable. The success page is read-only and cannot fulfill an order. It clears a matching cart only when Stripe and Postgres both verify paid state. A newer, different cart is preserved.

Database rate limits bound guest attempts and Vercel-provided client IP requests per five-minute window. Raw IPs are never persisted. Keep Vercel's trusted forwarded header semantics and production firewall controls under review. Rate-limit rows expire through the authenticated scheduled job. Browser closure does not release stock.

## Operator setup

1. Use Node 24 and `npm ci`. Keep all credentials in gitignored environment files.
2. The requested Neon project is linked locally via gitignored `.neon`; `neon.ts` declares Postgres only (`auth: false`). `neon deploy` applies infrastructure policy and pulls credentials; it does not migrate the commerce schema or deploy Vercel.
3. Test migrations on an isolated Neon branch, then run `npm run db:migrate` against the intended app branch. `npm run db:generate` creates future migrations; never use destructive schema push in production.
4. Run `npm run cms:migrate-commerce-copy` once with a temporary write token. It only initializes a missing checkout copy group and preserves existing groups (including cleared copy) and editorial drafts. Review this operational wording in Studio. If updating an already-initialized checkout group, set the optional Refresh label for the pending-state refresh control; migrations preserve existing groups rather than restoring cleared fields.
5. Apply migration `0004_typical_darwin.sql`, publish active products/sizes and explicitly open Fridays using `npm run commerce:pickup -- open YYYY-MM-DD`. Use `list` / `close YYYY-MM-DD` to manage dates. No menu/inventory sync is needed. Run `npm run commerce:check` for connectivity. See [launch operations](manual-menu-launch.md).
6. Run the scheduled handler every five minutes using `Authorization: Bearer <CRON_SECRET>`. `vercel.json` declares the schedule; a Vercel plan supporting this frequency is required. External schedulers can call the same endpoint. Configure before enabling checkout.

No database administration endpoint is public. Authorized operators use:

```sh
npm run commerce:export -- 2026-11-20 /private/operator/pickup-2026-11-20.csv
```

The script exports paid/partially refunded order items with order number, name/email/optional phone, integer-cent order/line totals and payment status. It prints a production summary by product and variant without contacts. The CSV refuses overwrites, uses mode 0600 and escapes spreadsheet formulas. Keep exports outside the repository and delete them according to the approved retention policy. Fully refunded orders are omitted from the production list; inspect financial records separately. An authenticated dashboard and fulfillment-status operations remain future admin work.

## Local verification

`npm test` checks pure business rules and real Stripe SDK signature verification. `npm run test:integration` requires `TEST_DATABASE_URL` pointing at a separate migrated QA database; it refuses the app URL. Integration tests exercise real Postgres locks, transactions and constraints, with synthetic Stripe envelopes only at the external boundary. `npm run test:e2e` exercises the live local app and sandbox Checkout; never run with live keys.

The former CMS QA-menu and synchronization commands are retired. Use the private pickup command against an isolated QA branch. Existing legacy CMS documents are retained without runtime reads or writes, preserving older deployments during rollout.

## Newsletter consent extension

The cart drawer captures explicit optional marketing consent before Stripe redirects. `orders.marketing_opt_in` defaults false; opt-in stores timestamp/source/wording/hash evidence and is later associated with the verified Stripe guest email. Consent participates in checkout idempotency and is never inferred from payment. See [marketing consent](marketing-consent.md).

`marketing_subscriptions` stores current per-email status and withdrawals. A verified opted-in payment updates this table inside the same fulfillment transaction, only if its consent is newer than the recorded consent and withdrawal. Public `/unsubscribe` changes current status without editing orders and remains available when checkout is disabled. Its separate root layout excludes storefront analytics/cart providers. Operator CSVs distinguish historical consent from current subscription status. Newsletter delivery remains future work; see [unsubscribe setup](unsubscribe.md).

New attempts explicitly persist `inventory_mode=uncapped` and create no inventory/reservation rows. Existing attempts default to `reserved` and retain strict stock fulfillment/release checks. A shared pickup-row lock serializes new checkout with manual closure. The authenticated scheduler reconciles payments/refunds and cleans rate limits only; it does not open dates or update inventory/catalog configuration.
