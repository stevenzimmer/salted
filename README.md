# Salted Focaccia

A complete Phase 1 frontend for **saltedfocaccia.com**: an editorial bakery storefront with a persistent browser cart, product and recipe pages, Friday pickup selection, and a safe special-order form preview.

## Run locally

Use Node.js 20.9+ (a current LTS release is recommended) and npm.

```sh
npm install
npm run dev
```

Open `http://localhost:3000`. No environment file, account, database, or API key is required. `.env.example` documents future integration variables. If needed, copy it to `.env.local` and leave all unused secrets blank. `.env.local` is gitignored.

```sh
npm run lint
npm run typecheck
npm test
npm run build
npm start
```

The production build uses Next.js’s supported webpack compiler because the local managed environment blocks Turbopack’s build worker port. Development still uses Turbopack. Both compile the same App Router application.

## Stack

Next.js 16, React 19, strict TypeScript, App Router, Tailwind CSS 4, and official shadcn/ui Sheet, Calendar, Button, Input, and Textarea primitives. Radix supplies accessible modal behavior; React Day Picker supplies the calendar. `lucide-react` supplies icons. `tsx` runs the focused Node test suite. The npm lockfile records installed versions.

Google Analytics 4 uses `@next/third-parties/google` in the root layout with measurement ID `G-FF1JFYJLTV`. It loads after hydration on every route, including local development. For client-side pageviews, keep Enhanced Measurement and “Page changes based on browser history events” enabled in the Google Analytics web stream. After deployment, verify visits in the property's Realtime report.

## Routes

| Route                | Purpose                                                                                                                                    |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `/`                  | Primary storefront, all eight products, seasonal editorial, how it works, about preview, mock testimonials, bread care, recipes, Instagram |
| `/products/[slug]`   | Eight product detail pages with size, quantity, pricing, ingredients/allergen draft notices, serving notes, care, related recipes/products |
| `/recipes`           | Editorial recipe index                                                                                                                     |
| `/recipes/[slug]`    | Three recipes with time, servings, ingredients, instructions, related products                                                             |
| `/special-orders`    | Validated local request preview                                                                                                            |
| `/pickup`            | Friday timing, Rocklin location, draft policies                                                                                            |
| `/about`             | Draft brand story and reserved imagery                                                                                                     |
| `/storage-heating`   | Structured draft bread-care guide                                                                                                          |
| `/order/success`     | Explicitly labeled confirmation preview, never proof of purchase                                                                           |
| `/privacy`, `/terms` | Draft legal pages                                                                                                                          |
| `/studio`            | Future CMS placeholder, no CMS installed                                                                                                   |

There is deliberately no `/order`, `/order/[date]`, `/cart`, or `/reviews` page. Checkout lives inside the cart Sheet. The order CTA points to `/#products`.

## Architecture

- `src/app`: Server Component pages, layouts, route metadata, and not-found page. The root is dynamic so the rolling mock schedule is never frozen at build time.
- `src/components/brand`, `layout`, `home`, `commerce`, `recipes`, `content`, `special-orders`: reusable visual components. Interactive leaves handle filtering, sizes, quantity, cart, calendar, and form behavior.
- `src/components/ui`: official shadcn components, themed for Salted. Registry helper imports point to `src/lib/utils.ts`.
- `src/types/content.ts`: explicit product, variant, recipe, cart, pickup, and inventory contracts.
- `src/data`: typed product catalog, separate cents-based pricing, relationships, recipes, reviews, site content, pickup config, special-order config, and draft policies.
- `src/lib/availability.ts`: pure complete-cart date intersection and inventory checks. Replace these at a future server/database boundary.
- `src/lib/cart.ts`: cart normalization and computed totals. `cart-store.ts` integrates local storage through `useSyncExternalStore`, supporting hydration, tab synchronization, validation, and an in-memory fallback.

### Mock schedule and inventory

The schedule is generated per request around the current **Pacific** date: recent closed/past Fridays plus upcoming Fridays. The next 10 weeks are represented, including a disabled bakery week. Cutoffs are Wednesday at 11:59:59 pm Pacific with daylight-saving offsets. Pickup is Friday, 2–6 pm.

Inventory records are separate `{ productId, variantId, pickupDateId, inventory }` rows. Seasonal focaccia is sold out, jalapeño pans are unavailable, specialty sourdough has low stock, and parmesan chili crisp is available on alternating mock Fridays. Other quantities are mock capacity examples. Nothing is reserved, decremented, or guaranteed. These rolling fixtures intentionally change with the weekly window; they are not production inventory semantics.

### Cart and checkout

Cart lines contain **only product ID, variant ID, and quantity**. The versioned `salted:cart:v1` local-storage key stores no prices, customer information, or dates. Duplicate lines merge; invalid stored data is rejected. Prices and totals are resolved from the typed catalog. Quantity limits reflect the maximum mock stock across upcoming open dates.

Checkout computes dates for which **every cart line has enough inventory**. Past, closed, disabled, missing-inventory, and insufficient-stock dates are unavailable. One selected date applies to the whole future order. Changing the cart invalidates a date that no longer fits, and continuing rechecks against the current cutoff time.

“Continue to payment” opens a clearly marked future-payment preview. No checkout session or order is created. The confirmation preview leaves the cart intact. A direct visit or query string is not evidence of payment. Tax calculation is deferred pending the actual requirements.

### Special orders

The configurable minimum is **$40 in products plus a separate $10 fee**. The fee never counts toward the minimum. The temporary lead time is five Pacific calendar days. Validation checks required contact information, the real calendar date and lead time, product description, and positive approximate quantity. Success is a safe local preview; nothing is sent, saved to a server, approved, or paid.

## Design assets

Tokens live in `src/app/globals.css`: cream, charcoal, copper, and restrained lavender, with butter and rose available for later content. The exact brand copper `#9D643F` is retained, with a darker `--copper-ink: #945C39` for small text and controls: it provides a 4.95:1 contrast ratio against cream. Images currently use `https://placehold.co/` with intentional portrait and landscape proportions; they are explicitly labeled photography placeholders. Remote image configuration is in `next.config.ts`. These placeholders use `unoptimized` to avoid a runtime image proxy dependency during development. Replace the image URLs and descriptive alt text in data files with final approved photography, add any new remote host to the config, and enable normal Next image optimization when appropriate.

Lora is loaded with `next/font/google`. The display configuration is isolated in `src/lib/fonts.ts`: Barlow Condensed is the temporary licensed Google font fallback. When licensed Balgin Condensed `.woff2` files are supplied, add them under `src/assets/fonts/` and replace only `displayFont` with `next/font/local`, retaining `variable: "--font-display"`. No unofficial Balgin files are downloaded. The simple text wordmark stays in the header; a temporary typographic seal reserves footer/brand space for the actual circular logo.

## Content and SEO

Ingredients, allergens, dietary classifications, founder copy, policies, recipes, reviews, and care instructions require approval. Data has explicit draft/mock status; visible notices keep the preview honest. Titles, descriptions, canonical paths, Open Graph defaults, semantic articles, and a favicon are included. The preview is `noindex, nofollow`; remove that setting only after content approval and launch preparation. Set `NEXT_PUBLIC_SITE_URL=https://saltedfocaccia.com` at production launch.

## Phase boundaries and next phase

No Sanity, Neon/Postgres, Drizzle, Stripe, Resend, React Email, Twilio, cron, authentication, real orders, real form submissions, or production inventory is implemented. Environment placeholders do not activate integrations.

Start Phase 2 only when requested: approve the content and open business decisions; add Sanity content adapters; design Postgres/Drizzle transactional inventory and reservations; add server-validated Stripe sessions and authoritative webhooks; then transactional email and optional-consent SMS. Keep editorial content separate from transactional state.

See `docs/open-decisions.md` for outstanding approvals, `docs/architecture.md` for integration boundaries, and `docs/phase-1-report.md` for the delivery and validation report.
