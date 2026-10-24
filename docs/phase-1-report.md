# Phase 1 delivery

## 1. What was built

A responsive Salted Focaccia storefront with the full requested homepage sequence, eight purchasable mock products, three draft recipes, product and recipe detail pages, a persistent cart, mocked pickup checkout, a safe special-order form, informational and legal pages, and a future Studio placeholder. Cream, charcoal, and copper anchor the editorial design; lavender marks the seasonal feature. All imagery uses intentional placehold.co assets.

## 2. Routes

`/`, `/products/[slug]` (eight products), `/recipes`, `/recipes/[slug]` (three recipes), `/special-orders`, `/pickup`, `/about`, `/storage-heating`, `/order/success`, `/privacy`, `/terms`, and `/studio`.

The 21 concrete content URLs return 200. `/order`, `/cart`, `/reviews`, and unknown product/recipe slugs return 404. No separate ordering, cart, or reviews page was added.

## 3. Major components

Wordmark and temporary brand seal; announcement, desktop/mobile header, footer; editorial hero; category-filtered product storefront; reusable product and recipe cards; variant radio groups; quantity controls; lazy-loaded cart Sheet; pickup Calendar; payment preview; special-order form; reusable page intro and legal layout. Server Components render page content, while small Client Components own interactions.

## 4. Architecture

Strict TypeScript, integer-cent pricing, catalog-resolved cart totals, validated versioned local storage, React `useSyncExternalStore`, explicit draft content, dynamic request-time schedule generation, Pacific date/cutoff handling including daylight saving, pure complete-cart availability checks, and no transactional integrations. Each future order owns exactly one pickup date; cart lines never own a date. The confirmation route always identifies itself as a preview and leaves the bag intact.

## 5. Dependencies

Next.js 16.4.3, React/React DOM 19.3.1, Tailwind CSS 4.3.3, TypeScript 6.0.3, official shadcn Sheet/Calendar/Button/Input/Textarea source, Radix UI, React Day Picker, date-fns, lucide-react, clsx, tailwind-merge, class-variance-authority, and tw-animate-css. Development tools include ESLint/config-next, Prettier, tsx, and type packages. Exact resolutions are locked in `package-lock.json`.

ESLint stays on 9.39.5 because the React and accessibility plugins bundled with the current Next ESLint config declare support through version 9. Version 10 runs but produces peer conflicts, so it is not retained. Upgrade when those declared compatibility ranges change.

## 6. Mock data

Typed products, independent pricing and sizes, bidirectional recipe relationships, draft recipes, mock reviews, site configuration, pickup settings, special-order settings, draft legal/storage content, rolling Friday dates, and separate per-product/variant/date inventory rows live in `src/data`. Ingredient and allergen claims are intentionally withheld until approved. Dietary labels remain empty.

## 7. Cart and checkout

Adding, merging, changing quantities, removing items, empty state, totals, reopening, and persistence work. Variant controls support keyboard arrows and unavailable options. Sold-out seasonal products cannot be added. A complete-cart intersection drives the enabled calendar dates, including inventory quantity and Pacific order cutoffs. A no-valid-dates state directs the customer to adjust the bag. The selected date is revalidated before the future-payment preview. No payment, order, stock reservation, form submission, or notification is created.

The special-order form applies the configured five-day lead time, validates contact details, real calendar dates, descriptions, and quantities, focuses the first invalid field, and shows an explicitly local success preview. The $40 product minimum and separate $10 fee are clearly disclosed.

## 8. Validation

- Lint: passed with no warnings.
- Strict TypeScript check: passed.
- Focused Node test suite: 11 tests passed, covering full-cart date intersection, cutoff boundaries, Pacific/DST handling, insufficient/missing inventory, duplicate quantity aggregation, sold-out and low-stock examples, invalid stored cart data, catalog pricing, and special-order date/contact/quantity validation.
- Production compilation: passed using Next.js’s supported webpack compiler. Turbopack development works; this managed environment blocks the worker port required by Turbopack production compilation. `npm run build` uses webpack so the standard command works here.
- Production runtime smoke test: homepage returns 200; direct add-to-bag and the pickup calendar work; no browser errors, warnings, or completed broken images were observed; canonical metadata and a single primary heading are present.
- Browser checks: all 21 content URLs; five expected 404 routes; category filters; size and quantity changes; direct add-to-bag; $15 pesto plus two $8 chili crisp items totaling $31; cart reload persistence; quantity changes and removal; empty bag; eligible/disabled calendar dates; selection and future-payment preview; confirmation; no-valid-dates handling; valid and invalid special-order forms; product detail disclosures and related recipes; recipe ingredients/instructions and related products.
- Responsive checks: no homepage horizontal overflow at 320, 390, 768, 1024, or 1440 px; mobile navigation, form, product details, recipes, and cart/calendar were inspected.
- Keyboard checks: radio arrow navigation, menu focus containment, Escape dismissal, return to the originating cart/add button, and focused checkout headings. Reduced-motion support and visible focus styles are included.
- Contrast check: exact brand copper is preserved; a darker copper text/control token provides 4.95:1 against cream. Body text measures 13.79:1, muted text 5.38:1, and charcoal on lavender 8.21:1. The keyboard skip link reaches the primary content.

## 9. Remaining decisions

See `open-decisions.md`: approved photos and Balgin files, final logo, ingredient/allergen and dietary data, recipe/testimonial approvals, final founder copy, pickup address and policies, taxes, capacity/inventory semantics, seasonal flavors, specialty loaf details, special-order lead time, low-stock rules, pickup-date ownership, legal policies, and notification timing.

## 10. Recommended Phase 2

Approve content and business rules first. Then add Sanity read adapters and content editing, Postgres/Drizzle order and inventory models with atomic reservations, server-owned checkout validation, Stripe sessions and authoritative idempotent webhooks, and transactional email. Add SMS only with explicit optional consent. Enable public indexing and production metadata after content and checkout approval. No Phase 2 work has been started.
