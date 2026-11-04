# Phase 2 implementation report

Branch: `feat/phase-2-sanity-cms`, created from clean local `main`. No push, deployment, or Phase 3 commerce work was performed.

## 1. Implementation

The approved route/component structure was audited before code changes. Sanity now owns editorial copy and imagery throughout the existing website. Layout, styling, homepage order, routes, responsive architecture, cart interactions and operational rules remain code-owned. The inactive seasonal/About-preview/storage-callout homepage sections remain inactive. See the exhaustive [content map](cms-content-map.md).

## 2. Packages

Added `next-sanity` 13.4, `sanity` 6.22, `@sanity/client` 8.14, `@sanity/image-url` 2.1, `@portabletext/react` 8, `styled-components` 6.6 and `server-only`. The QA helper uses Sanity's preview-secret package. Next.js 16.4.3, React 19.3.1, TypeScript 6 and Tailwind 4 were retained. Sanity raises the supported Node minimum to 22.12; use Node 24 LTS on staging. The final build was also checked with installed Node 22.12.

Scoped overrides patch old `js-yaml`, `smol-toml` and `undici` dependencies in Sanity's CLI tooling. npm's install report now has no high/critical advisories and still reports moderate tooling advisories. No forced framework upgrade was performed.

## 3–4. Schema and singletons

Repeatable documents: `product`, `recipe`, `review`. Reusable objects: `imageWithAlt` (hotspot/crop, alt, decorative flag, caption), `seo`, restricted `portableText`, `productVariant`, `recipeIngredientGroup`, `recipeStep`, `instagramPhoto`.

Ten fixed-ID singletons: `homepage`, `pickupPage`, `specialOrdersPage`, `aboutPage`, `storageHeatingPage`, `recipesPage`, `privacyPage`, `termsPage`, `commerceCopy`, `siteSettings`. Curated Structure links directly to each. Duplicate/delete/unpublish actions and new-document templates are removed for singletons. Public names remain optional and internal names never become customer-facing fallbacks. Display order applies to repeatable content only; there is no page builder.

## 5–6. Routes and queries

Public routes are unchanged. Route groups separate the website root layout from Studio. `/studio/[[...tool]]` embeds `NextStudio`, with no indexing or website overlays. `/api/draft-mode/enable` uses Sanity's official secret validator; `/api/draft-mode/disable` clears Draft Mode and redirects safely. A site catch-all renders CMS 404 copy.

Twelve centralized typed queries: `GLOBAL_QUERY`, `HOME_QUERY`, `RECIPES_QUERY`, `RECIPE_QUERY`, `PRODUCT_QUERY`, `ABOUT_QUERY`, `PICKUP_QUERY`, `SPECIAL_ORDERS_QUERY`, `STORAGE_QUERY`, `RECIPES_PAGE_QUERY`, `PRIVACY_QUERY`, `TERMS_QUERY`. They fetch through `sanityFetch` from `defineLive`. Website queries explicitly select `published` or authenticated `drafts`; shared global data is request-deduplicated. Editorial strings retain source mapping; metadata, URLs, enum comparisons, alt text and analytics are cleaned.

## 7–8. Visual Editing and Presentation

Website layout renders `SanityLive`. Draft Mode alone renders Visual Editing. Image annotations include document ID/type and field path, including keyed gallery/Instagram images. Code-owned display ratios are supplied to Sanity’s image builder so editor crop/hotspot selections take effect. Presentation starts at `/`, uses the secure enable/disable endpoints and has resolvers for every document type.

The installed next-sanity 13 default Visual Editing handler ignores mutation refreshes. `DraftVisualEditing` explicitly calls `router.refresh()` on Presentation refresh notifications so edits can update without sharing an Editor/read token with the browser. `browserToken` remains disabled; authenticated Studio notifications drive draft refreshes. A dedicated Viewer token is recommended for server reads after setup; the user-requested `SANITY_API_TOKEN` alias is supported server-side for both read and seed operations.

Localhost and the stable staged Vercel origin have credentialed CORS entries. No wildcard or future production domain was added. Automated Studio QA reaches the Sanity sign-in screen; the signed-in editor confirmed that content clicks open the correct fields. The mutation-refresh fix was added after the editor reported stale draft previews. After reloading Presentation, the signed-in editor confirmed that draft edits now update live.

## 9–10. Migration and removed mock content

Imported **24 documents and 17 distinct image assets** into the configured dataset. This includes eight products, three recipes, three clearly illustrative reviews, and ten singletons. Local Instagram photographs and external Phase 1 placeholders are now Sanity image assets. The second seed run created zero documents and imported zero images, preserving all 24 existing documents.

`scripts/seed/content.json` is migration-only. The website does not import it. Existing draft/published IDs are preserved; missing documents are created atomically. Old `products.ts`, `pricing.ts`, `recipes.ts`, `reviews.ts`, `site-config.ts`, `instagram.ts` and `content-pages.ts` were removed. Remaining local config is operational only. There are no permanent runtime fallback images.

## 11–12. Conditional content and TypeGen

Stega-aware helpers govern text, arrays, images, card visibility and Portable Text. Empty fields remove elements; empty optional sections, lists, cards, image wrappers and columns collapse. Form fields keep code-owned accessible programmatic labels when visible labels disappear. Blank-label variants are filtered before purchase/cart use. Removed products/variants cannot remain resolvable from browser storage.

Schema extraction and TypeGen generated and committed `schema.json` and `sanity.types.ts`: **35 schema types and 12 queries**, including structural required fields. Configuration lives in `sanity.cli.ts`; `prebuild` regenerates artifacts.

## 13. QA

- Lint and strict TypeScript pass.
- Existing cart, availability, Pacific/DST/cutoff, pricing, form-validation and analytics tests pass.
- All 27 tests pass. Additional tests cover real Sanity stega encoding, missing/whitespace text, empty CTAs, complete header/hero removal, empty Portable Text blocks, missing assets/alt, decorative images, image annotations, blank variants, cleared cards, deleted catalog identities and unsafe URLs.
- The production webpack build passes on Node 22.12, including schema extraction and TypeGen.
- Seed validation and idempotence checks pass.
- `/studio` loads; its authentication screen and metadata were verified.
- Unsigned Draft Mode enable returns 401. A valid short-lived Sanity preview session enables the cookie and serves stega-encoded draft content. Disable removes the cookie. A temporary draft-only product returns 404 to a normal browser.
- Authenticated draft removal QA cleared the isolated product's heading/eyebrow/badge/body/image/variants/lists/relationships. The corresponding heading, badge, image wrapper, purchase UI, food subsection and gallery disappeared. Long product headings/body fit at 390px without horizontal overflow. The temporary draft and secret were deleted afterward.
- Mobile route checks covered storefront, product detail, recipe index/detail, pickup, About, storage, policies, confirmation and 404. Special-order validation was verified separately: six empty-field errors, focus moves to name, valid input produces only local preview success.
- Cart browser QA verified adding a product, increasing quantity, $14 subtotal for two classic rounds, persistence after reload, whole-cart pickup calendar, payment preview and confirmation navigation. No order/payment was created; the bag remains intact.
- Homepage screenshots were visually inspected at 390px and 1440px. Normal homepage has the existing six focaccia cards by default; controls still filter the eight-product catalog. No horizontal overflow was observed.
- Draft metadata is free of stega; image annotations identify the correct product document/type/field. No token is passed to browser props.

The signed-in editor confirmed working field navigation and live draft updates after the mutation-refresh correction. Image-field replacement and publish-to-normal-visitor updates remain recommended manual acceptance checks. The automated browser does not hold the editor's login session. Studio development diagnostics about suspended default fields were observed during HMR; no custom page/field components or transaction integrations were added in response.

## 14–16. Boundaries, manual configuration, next steps

Essential accessibility names, decorative marks/numbering, routes/destinations, formatting, layout, calendar/cart rules, inventory fixtures, lead time and operational minimum/fee remain code-owned. All exceptions are documented in the content map. Business/editorial approval notices were preserved; final food/safety/founder/legal claims were not invented.

Before any authorized deployment, configure the documented Sanity public values and server-only Viewer token in Vercel, keep the temporary write token out of Vercel, and sign into Vercel-protected staging before opening Presentation. Add the exact production CORS origin only after a production domain is approved/connected. Resolve remaining business/content decisions, complete the signed-in editor acceptance checks, and then request deployment explicitly. Phase 3 remains deferred.

## Navigation follow-up

Site Settings → Navigation is now a repeatable, reorderable list with Menu text and Link fields, capped at seven items. Menu items are independent of named routes/slots. The desktop, mobile and footer menus share the configured order and labels. Utility labels (cart, storage, privacy, terms) moved into their own group. Existing published and draft settings were migrated independently with revision guards; unrelated content and draft status are preserved. New seed data uses the repeatable structure. TypeGen now generates 36 schema types and the existing 12 queries. The header can wrap longer lists without horizontal overflow; blank labels/links are hidden and unsafe URLs rejected. This explicitly supersedes the earlier code-owned navigation-destination boundary.

Follow-up validation: lint, TypeScript, all 34 tests, seed dry-run, schema extraction/TypeGen, and the supported-Node production build pass. Both existing settings documents were migrated, and a second migration run made no changes. Browser checks confirmed matching desktop/mobile/footer order, mobile Escape/focus restoration, and seven-item layouts without horizontal overflow (the layout stress test used browser DOM changes only, not CMS edits).
