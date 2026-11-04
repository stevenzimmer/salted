# Salted Focaccia

Next.js 16 / React 19 bakery storefront with Sanity 6 editorial content, an embedded Studio, and Visual Editing. The approved Phase 1 layout and browser cart remain in place. Checkout and special orders are still local previews: there are no payments, orders, reservations, or messages.

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

`scripts/seed/content.json` is an archival migration input containing the actual Phase 1 copy: **10 singletons, 8 products, 3 recipes, 3 illustrative reviews**. It is never imported into the website. Sanity becomes the sole editorial source after import; do not keep editing this file as a parallel production catalog.

`npm run cms:seed` uses `SANITY_API_WRITE_TOKEN` or the setup alias `SANITY_API_TOKEN`. It checks both draft and published IDs, preserves existing documents, uploads local Instagram images and remote placeholders as Sanity assets, and creates missing documents atomically with `createIfNotExists`. Repeated runs preserve editor work and do not re-upload existing documents' images. If an image download fails, the import stops with an error. An explicit `--skip-placeholder-images` imports copy and local photos while leaving placeholder image fields unset. No runtime fallback image exists. Final photography, ingredients, allergens, reviews, recipes, founder copy, care instructions, and policies still require approval.

Only the initial fixture catalog has mock inventory. A new CMS product or variant has **zero** availability until a developer explicitly adds a preview inventory row. Availability, quantities, Pacific cutoffs, pickup dates, fees, and the special-order lead-time rule remain code-owned.

## Editing workflow

1. Visit `/studio` and sign in as a project member.
2. Select **Presentation**. It opens the real website at `/`.
3. The official `defineEnableDraftMode` route validates Sanity's preview secret before enabling the session.
4. Click text or an image overlay to open its field. Edit a draft; the preview updates through Sanity's Presentation/Live integration.
5. Publish when copy is approved. Ordinary visitors see only published documents.
6. Outside Presentation, **Exit draft preview** calls `/api/draft-mode/disable`. The link does not prefetch.

In Site Settings, **Announcement bar** groups the **Show announcement bar** toggle with the message text. The group starts expanded so both controls are easy to find.

Clearing text (including whitespace or stega-only text) removes its element and, where appropriate, its wrapper. Empty CTA labels remove the entire CTA. Empty navigation labels or links remove that item. Site Settings → Navigation is a reorderable list of up to seven items with editable menu text and destinations, shared by the desktop, mobile and footer menus. Cart and supplemental footer wording is under Utility labels. Removing an image removes its wrapper. Meaningful images require alt text; decorative images use `alt=""`. Studio fields can still be edited through Structure after all visible content has been removed.

Fixed singleton IDs: `homepage`, `pickupPage`, `specialOrdersPage`, `aboutPage`, `storageHeatingPage`, `recipesPage`, `privacyPage`, `termsPage`, `commerceCopy`, `siteSettings`. Structure links directly to these IDs. New-document templates, duplicate, delete, and unpublish actions are disabled for singletons. Products, recipes, and reviews are repeatable. Internal names are required for Studio organization and never substitute for cleared public names.

There is **no page builder**. Homepage order remains Hero → How It Works → Products → Recipes → Reviews → Instagram. The three commented-out Phase 1 homepage sections were not activated. Navigation menu text, destinations and item order are editable (maximum seven). Fonts, colors, grids, page routes, fixed section CTA destinations, component placement, calendar, cart, validation rules, accessibility, animation, and checkout stay in code. Policies use restricted Portable Text. Recipes use ingredient groups and instruction steps.

## Routes and architecture

Existing public routes remain `/`, `/products/[slug]`, `/recipes`, `/recipes/[slug]`, `/pickup`, `/special-orders`, `/about`, `/storage-heating`, `/privacy`, `/terms`, `/order/success`. Checkout stays inside the cart Sheet. `/studio/[[...tool]]` replaces the placeholder. The only new API routes enable/disable Draft Mode. A site catch-all renders the CMS-controlled 404.

- `src/app/(site)`: dynamic website root layout, metadata, server pages, `SanityLive`, and draft-only `VisualEditing`.
- `src/app/(studio)`: separate root layout and `NextStudio`; no storefront, analytics, cart, `SanityLive`, or Visual Editing overlays.
- `src/sanity/schema`: fixed content slots, reusable objects, repeatable documents, validation.
- `src/sanity/lib/queries.ts`: all 12 organized `defineQuery` queries. `sanityFetch` from `defineLive` supplies live content and source maps. Shared settings, commerce copy, and the current catalog are fetched once per React request through `getGlobalContent`.
- `schema.json`, `sanity.types.ts`: committed generated schema and query types. Small mappers adapt generated content to existing commerce props without stripping editorial source maps.
- `src/components/cms`: conditional text, restricted Portable Text, image rendering and `createDataAttribute` image annotations.
- `src/data`: operational preview schedule/inventory and special-order rules only.
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

The existing webpack production build is retained. Tests cover complete-cart availability, DST/cutoff rules, catalog pricing, analytics, stega-aware removals, Portable Text, image annotations, missing images, deleted catalog identities, and blank variant labels. The optional `npm run cms:qa -- prepare|long|clear|cleanup` workflow creates only a clearly identified temporary draft and a short-lived preview session, for authenticated browser QA. Always run cleanup. It does not publish or alter real content. See [Phase 2 QA/report](docs/phase-2-report.md) for performed checks and remaining editor acceptance steps.

Google Analytics (`G-FF1JFYJLTV`) remains on website routes. It records preview activity, never purchases. See [analytics](docs/analytics.md).

## Deployment and future work

See [deployment](docs/deployment.md) before any push or deployment. This phase does not push or deploy. Add Sanity environment values to the appropriate Vercel environments before a future authorized deployment, using the explicit Viewer token for reads. The temporary seed token is not needed in Vercel.

See [CMS content map](docs/cms-content-map.md), [architecture](docs/architecture.md), and [open decisions](docs/open-decisions.md). Phase 3 is not started: Postgres owns future orders/inventory/reservations, Stripe webhooks will own payment completion, and messaging remains deferred.

## Navigation field migration

The Navigation field is a sortable array of `navigationItem` objects (`label` / Menu text and `href` / Link), capped at seven items in both schema validation and website rendering. Editors can add/remove/reorder items without choosing named menu slots. Links accept site paths, same-page anchors, HTTP(S), `mailto:` and `tel:`. Invalid or blank links/labels do not render. Cart and supplemental footer labels live in `utilityLabels`; their controls/destinations stay code-owned.

Existing Phase 2 datasets need this one-time migration (already applied to the local configured dataset):

```sh
npm run cms:migrate-navigation -- --dry-run
npm run cms:migrate-navigation
```

The migration preserves published and draft labels separately, moves utility wording, retains unrelated fields, and does not publish drafts. Revision guards prevent concurrent edits from being overwritten. Reruns leave existing arrays (including intentionally empty ones) unchanged. Fresh seeds already use the new structure. Regenerate `schema.json` and `sanity.types.ts` after schema changes.
