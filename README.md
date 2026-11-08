# Salted Focaccia

Next.js 16 / React 19 bakery storefront with Sanity 6 editorial content, an embedded Studio, and Visual Editing. The approved Phase 1 layout and browser cart remain in place. Phase 3 adds Neon/Drizzle orders and manual pickup Fridays, guest Stripe-hosted Checkout and verified webhook orders behind `COMMERCE_ENABLED=false`. Stripe is test-only; special orders remain a local preview and messaging is deferred.

## Local setup

Use Node **24 LTS** (staging uses 24.x), or a supported Node 22 release >=22.12, and npm. Sanity 6 raises Phase 1's Node minimum; Next.js, React, TypeScript, and Tailwind were not upgraded for this integration. Node 25 is outside the supported dependency range.

```sh
npm ci
cp .env.example .env.local
```

Configure an existing Sanity project and a **public** dataset (normally `production`) at [Sanity Manage](https://www.sanity.io/manage). Public visitors fetch published editorial content without credentials. Drafts remain authenticated. Never put customer records or transactional state in this dataset.

```dotenv
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_SANITY_PROJECT_ID=your-project-id
NEXT_PUBLIC_SANITY_DATASET=production
NEXT_PUBLIC_SANITY_API_VERSION=2026-02-01
SANITY_API_READ_TOKEN=your-viewer-token
```

In the project's **API → Tokens**, create a token with the **Viewer** role for `SANITY_API_READ_TOKEN`. It is imported only by server modules. `defineLive` uses `serverToken` and explicitly disables `browserToken`; Presentation uses its authenticated Studio connection for draft updates. The draft-only Visual Editing wrapper explicitly handles mutation refreshes because next-sanity 13’s default handler ignores them. No read/write credential is serialized into the website. Standalone draft tabs can be refreshed manually; live draft editing takes place inside Presentation.

For compatibility, **`SANITY_API_TOKEN` is a server-only fallback** for both reads and seeding. It can be used during setup with an Editor token. Prefer the explicit Viewer token for runtime reads afterward; use `SANITY_API_WRITE_TOKEN` only for the initial import. Never prefix either token with `NEXT_PUBLIC_`, commit `.env.local`, or add a write token to frontend props. The shared alias must remain available until runtime reads have been switched to the Viewer token.

Add credentialed CORS origins in Sanity **API → CORS Origins**:

- `http://localhost:3000`
- `https://salted-focaccia-stevenzimmers-projects.vercel.app`
- The exact approved production origin when it is actually connected.

Do not add a wildcard for Vercel preview deployments. Add each needed preview origin explicitly, or use stable staging. Presentation's relative preview URL automatically uses the embedded Studio's origin. Vercel Authentication must also allow the editor to open the preview iframe; sign into the staging deployment first.

Seed before first starting the site, then run:

```sh
npm run cms:seed -- --dry-run
npm run cms:seed
npm run dev
```

Open `http://localhost:3000` and `/studio`. If the server was already running against an empty dataset, restart it after the first seed; stale development fetch caches may also need clearing. A configured CMS fetch failure surfaces as an error; it never silently switches back to hard-coded content. Without project configuration, content slots are empty and Studio shows setup instructions.

## Initial content and images

`scripts/seed/content.json` is an archival migration input containing the actual Phase 1 copy: **10 singletons, 2 product categories, 8 products, 3 recipes, 3 illustrative reviews**. It is never imported into the website. Sanity becomes the sole editorial source after import; do not keep editing this file as a parallel production catalog.

`npm run cms:seed` uses `SANITY_API_WRITE_TOKEN` or the setup alias `SANITY_API_TOKEN`. It checks both draft and published IDs, preserves existing documents, uploads local Instagram images and remote placeholders as Sanity assets, and creates missing documents atomically with `createIfNotExists`. Repeated runs preserve editor work and do not re-upload existing documents' images. If an image download fails, the import stops with an error. An explicit `--skip-placeholder-images` imports copy and local photos while leaving placeholder image fields unset. No runtime fallback image exists. Final photography, ingredients, allergens, reviews, recipes, founder copy, care instructions, and policies still require approval.

The launch menu uses active published products and active sizes on every manually opened Friday, without stock quantity caps. New active sizes need no inventory row. Pickup dates are opened/closed with the private operator command; Pacific cutoffs, input limits and special-order rules remain code-owned. No mock availability is used by the storefront.

## Editing workflow

1. Visit `/studio` and sign in as a project member.
2. Select **Presentation**. It opens the real website at `/`.
3. The official `defineEnableDraftMode` route validates Sanity's preview secret before enabling the session.
4. Click text or an image overlay to open its field. Edit a draft; the preview updates through Sanity's Presentation/Live integration.
5. Publish when copy is approved. Ordinary visitors see only published documents.
6. Outside Presentation, **Exit draft preview** calls `/api/draft-mode/disable`. The link does not prefetch.

In Site Settings, **Announcement bar** groups the **Show announcement bar** toggle with the message text. The group starts expanded so both controls are easy to find.

Clearing text (including whitespace or stega-only text) removes its element and, where appropriate, its wrapper. Empty CTA labels remove the entire CTA. Empty navigation labels or links remove that item. Site Settings → Header navigation and Footer navigation are separate reorderable lists, each capped at seven items with editable menu text and destinations. The desktop and mobile header share Header navigation. Storage + reheating is a regular sortable Footer navigation item. Cart and legal-link wording remains under Utility labels. Removing an image removes its wrapper. Meaningful images require alt text; decorative images use `alt=""`. Studio fields can still be edited through Structure after all visible content has been removed.

Fixed singleton IDs: `homepage`, `pickupPage`, `specialOrdersPage`, `aboutPage`, `storageHeatingPage`, `recipesPage`, `privacyPage`, `termsPage`, `commerceCopy`, `siteSettings`. Structure links directly to these IDs. New-document templates, duplicate, delete, and unpublish actions are disabled for singletons. Products, recipes, and reviews are repeatable. Internal names are required for Studio organization and never substitute for cleared public names.

There is **no page builder**. Homepage order remains Hero → How It Works → Products → Recipes → Reviews → Instagram. The three commented-out Phase 1 homepage sections were not activated. Navigation menu text, destinations and item order are editable (maximum seven). Fonts, colors, grids, page routes, fixed section CTA destinations, component placement, calendar, cart, validation rules, accessibility, animation, and checkout stay in code. Policies use restricted Portable Text. Recipes use ingredient groups and instruction steps.

## Routes and architecture

Existing public routes remain `/`, `/products/[slug]`, `/recipes`, `/recipes/[slug]`, `/pickup`, `/special-orders`, `/about`, `/storage-heating`, `/privacy`, `/terms`, `/order/success`. Checkout stays inside the cart Sheet. `/studio/[[...tool]]` replaces the placeholder. API routes also serve checkout, availability, explicit cancellation, signed Stripe webhooks and authenticated scheduled commerce recovery. A site catch-all renders the CMS-controlled 404.

- `src/app/(site)`: dynamic website root layout, metadata, server pages, `SanityLive`, and draft-only `VisualEditing`.
- `src/app/(studio)`: separate root layout and `NextStudio`; no storefront, analytics, cart, `SanityLive`, or Visual Editing overlays.
- `src/sanity/schema`: fixed content slots, reusable objects, repeatable documents, validation.
- `src/sanity/lib/queries.ts`: all centralized `defineQuery` queries. `sanityFetch` from `defineLive` supplies live content and source maps. Shared settings, commerce copy, and the current catalog are fetched once per React request through `getGlobalContent`.
- `schema.json`, `sanity.types.ts`: committed generated schema and query types. Small mappers adapt generated content to existing commerce props without stripping editorial source maps.
- `src/components/cms`: conditional text, restricted Portable Text, image rendering and `createDataAttribute` image annotations.
- `src/data`: pickup rules, historical test fixtures and special-order rules only.
- `src/lib/cart.ts`: validates browser records against the current CMS catalog, resolves integer-cent prices, and preserves the versioned local-storage cart shape.

Metadata is cleaned with Sanity's stega utility. Canonical paths are code-owned. The entire staging website remains `noindex, nofollow`; Studio is also non-indexable. Set the approved site URL and resolve [open decisions](docs/open-decisions.md) before a launch.

## TypeGen and quality checks

```sh
npm run typegen
npm run lint
npm run typecheck
npm test
npm run build
```

`sanity.cli.ts` configures TypeGen; there is no deprecated `sanity-typegen.json`. The `typegen` script extracts required structural fields and generates all query types. `prebuild` runs it automatically. Regenerate after schema/query changes and commit both artifacts. Extraction uses a non-existent project-ID placeholder only when unconfigured, allowing offline schema validation; runtime fetches are explicitly guarded.

The existing webpack production build is retained. Tests cover complete-cart availability, DST/cutoff rules, catalog pricing, analytics, stega-aware removals, Portable Text, image annotations, missing images, deleted catalog identities, and blank variant labels. The optional `npm run cms:qa -- prepare|long|clear|inactive|cleanup` workflow creates only a clearly identified temporary draft and a short-lived preview session, for authenticated browser QA. Always run cleanup. It does not publish or alter real content. See [Phase 2 QA/report](docs/phase-2-report.md) for performed checks and remaining editor acceptance steps.

Google Analytics (`G-FF1JFYJLTV`) remains on website routes. It records preview activity, never purchases. See [analytics](docs/analytics.md).

## Deployment and future work

See [deployment](docs/deployment.md) before any push or deployment. This phase does not push or deploy. Add Sanity environment values to the appropriate Vercel environments before a future authorized deployment, using the explicit Viewer token for reads. The temporary seed token is not needed in Vercel.

See [CMS content map](docs/cms-content-map.md), [architecture](docs/architecture.md), and [open decisions](docs/open-decisions.md). Postgres now owns orders/inventory/reservations; verified Stripe webhooks and scheduled reconciliation own payment completion. Messaging remains deferred to Phase 4.

## Header and footer navigation

Site Settings has separate **Header navigation** and **Footer navigation** arrays of `navigationItem` objects (`label` / Menu text and `href` / Link). Each is capped at seven items in schema validation and website rendering. Editors can add/remove/reorder either menu independently. The desktop and mobile menus both use Header navigation. Footer navigation contains **Storage + reheating** as a normal sortable item; there is no fixed extra storage link.

Links accept site paths, same-page anchors, HTTP(S), `mailto:` and `tel:`. Blank or invalid items do not render. Empty footer navigation remains empty and does not fall back to the header. Cart and privacy/terms wording remains in `utilityLabels`.

Datasets with the earlier shared Navigation array need this one-time migration (already applied to the configured dataset):

```sh
npm run cms:split-navigation -- --dry-run
npm run cms:split-navigation
```

The migration copies the old shared menu into each list, adds the existing Storage + reheating wording to the footer list, and removes the obsolete shared field and storage utility label. Published and draft versions are migrated independently, with revision guards and no draft publishing. Existing separate arrays, including intentionally empty ones, are preserved on reruns. A migration that would exceed seven items stops without discarding content. Fresh seeds already use the separate arrays. For datasets still on the original named-field Navigation object, run `npm run cms:migrate-navigation` first. Regenerate and commit `schema.json` and `sanity.types.ts` after schema changes.

Product categories are editable documents in Studio → Product categories. Create
or revise a category there, assign it in each product's Category field, and select
it in Commerce Copy → Product → Product filters. Filter labels and order remain
independently editable; enable Show all products for an unfiltered entry. The
first labeled entry with a valid target is selected initially; clearing the list
shows all products without filter buttons. Category names can change without
breaking product/filter matches. Reassign products and remove filter references
before deleting a category; Sanity protects referenced categories from deletion.
Product size selection uses the shared Choose size copy for every category.

Existing datasets need this one-time migration before using the new schema:

```sh
npm run cms:migrate-product-filters -- --dry-run
npm run cms:migrate-product-filters
```

It creates missing category documents from existing category strings, converts
product categories and filter targets to references, and handles either the
original three label fields or the earlier string-based filter array. Published
and draft versions are migrated independently with revision guards, preserving
labels, product inventory identities, unrelated copy, existing category documents,
and deliberately empty filter lists. Drafts are not published. Reruns do not
overwrite revised categories or lists. Fresh seeds contain category documents and
references already.

Inactive products stay accessible at their existing product URLs and keep their
editorial details, but disappear from the storefront and cannot be added to a bag.
Their purchase controls are replaced by Commerce Copy → Inactive product, with
optional heading, body and CTA text. The CTA always links to `/special-orders`.
Clearing these fields removes their elements without restoring default text.

Existing datasets need the new copy slots initialized once:

```sh
npm run cms:migrate-inactive-products -- --dry-run
npm run cms:migrate-inactive-products
```

This adds the new group only where absent, preserving existing groups, unrelated
copy and draft status. Fresh seeds already include it. Product activation and
pickup-date opening remain separate: the launch menu is uncapped, and no future open Friday means unavailable ordering.

## Phase 3 sandbox commerce

The requested Neon project `spring-glitter-05463559` is linked locally to branch `production`. `neon.ts` declares Postgres only, with no Auth, storage or other services. `neon deploy` pulls database credentials; `.neon` and `.env.local` stay gitignored. The default commerce flag is false and live Stripe keys are rejected.

```sh
npm run db:migrate
npm run cms:migrate-commerce-copy # one-time migration, temporary Sanity write token
npm run commerce:pickup -- open 2026-11-20 # explicitly open one future Friday
npm run commerce:check
npm run stripe:listen -- 3000    # official CLI, stores actual local secret privately
COMMERCE_ENABLED=true npm run dev
```

Complete a test checkout from the existing product selectors, cart drawer and pickup calendar. Use a manually opened future Friday and published active products/sizes for the entire bag. The read-only success page confirms only an order verified in both Stripe and Postgres. The browser capability cookie protects order summaries; contact details are operator-only.

Run `npm run test:integration` with a separate migrated `TEST_DATABASE_URL` for real Postgres concurrency/state tests. Run `npm run test:e2e` with a locally running test-enabled app and Chromium. Set `PLAYWRIGHT_BASE_URL` for an alternate port. Use `commerce:pickup -- open|close YYYY-MM-DD` to control test Fridays in the isolated QA database; no CMS menu fixture is needed.

Operator-only CSV and production summary:

```sh
npm run commerce:export -- 2026-11-20 /private/operator/pickup.csv
npm run commerce:reconcile
```

Configure five-minute authenticated cron before enabling hosted checkout. No website push/deployment, live payment activation, live Stripe resources, custom email or SMS are included. See [integration plan](docs/stripe-integration-plan.md), [architecture/setup](docs/commerce-architecture.md), [inventory and initialization](docs/inventory-lifecycle.md), [webhook testing](docs/stripe-webhook-testing.md), [verification evidence](docs/phase-3-verification.md), [launch decisions](docs/phase-3-open-decisions.md), and [Vercel environments](docs/deployment.md).

## Optional newsletter consent

The pickup step offers an unchecked, optional newsletter checkbox above **Continue to Stripe**. Edit its wording in **Commerce Copy → Marketing Consent → Label**; clearing the label removes the control. Opt-in is saved with a timestamp, source, accepted wording and wording hash on the order, then associated with the actual guest email from the verified Stripe payment. Existing orders default to opted out.

Apply the database migration and initialize the new copy slot with `npm run cms:migrate-marketing-consent`. The copy migration preserves existing editorial content and drafts. No newsletters are sent and no email-provider contacts are created. See [consent setup and data lifecycle](docs/marketing-consent.md).

Customers can unsubscribe at **`/unsubscribe`**. The page saves a current per-email opt-out in Postgres, gives the same confirmation for every valid address and leaves original order consent evidence intact. It works with checkout disabled and does not send emails.

Apply `npm run db:migrate` and `npm run cms:migrate-unsubscribe` when updating another environment. Edit page wording under **Commerce Copy → Unsubscribe**. After deploying the route, run `npm run cms:migrate-unsubscribe -- --include-navigation` to add **Email preferences** to the footer. This timing keeps the existing staged site from linking to an undeployed page. Future newsletters can use signed confirmation links with the server-only `MARKETING_UNSUBSCRIBE_SECRET`. See [unsubscribe behavior, setup and testing](docs/unsubscribe.md).

## Manual launch menu

**Friday menus & planned inventory** has been removed from Studio. Publish product/size Active switches to control the menu on every open Friday. Stock caps and menu automation are deferred. Open/close Fridays with `npm run commerce:pickup -- open YYYY-MM-DD` / `close YYYY-MM-DD`; `list` shows the current schedule. Apply migration `0004_typical_darwin.sql` first. Existing legacy dates need explicit manual adoption, and old reservations retain their original lifecycle. See [operator setup and rollout](docs/manual-menu-launch.md).
