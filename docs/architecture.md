# Integration boundaries

Sanity is authoritative for editorial content. App Router Server Components use centralized generated GROQ query types and `sanityFetch` from `defineLive`. Small mappers preserve the existing product/recipe prop contracts and encoded editorial strings. Shared settings, commerce copy, and catalog content use a request-deduplicated server fetch; interaction boundaries remain small.

The website and embedded Studio have separate root layouts. Only the website renders `SanityLive`; only authenticated Draft Mode renders `VisualEditing`. The official preview-secret handshake protects Draft Mode. Read tokens and compatibility aliases are server-only. Text source maps survive mapping and rendering. Image annotations include document ID, type, and exact field path. Clean strings only when checking presence or crossing structural/metadata/accessibility boundaries.

The CMS is a fixed content model, not a page builder. See [content map](cms-content-map.md) and [README](../README.md). Do not reintroduce local production copy or permanent fallback imagery. Empty editorial content collapses at the appropriate wrapper boundary.

## One order, one pickup date

A cart line stays `{productId, variantId, quantity}`. Display-only observed prices are stored separately to require review after a price change; neither they nor browser totals are authoritative. The order-level pickup date is selected in the drawer. Stored input is validated, and disabled/deleted products must be removed before checkout. Server validation reloads published Sanity prices.

Published active products and sizes define the launch menu on every eligible future Friday, except published Sanity blackout dates, without quantity-based inventory caps. `validPickupDates` checks complete-cart offerings, quantities, CMS blackout dates and Pacific cutoffs. Explicit recurring offerings (or legacy null stock) mean uncapped; a missing offering remains unavailable. No mock stock or CMS weekly-menu sync feeds the storefront. Separate pickup dates require separate orders. See [manual launch operations](manual-menu-launch.md).

## Transactional ownership

Postgres owns orders, immutable item snapshots, payment state, inventory, reservations and checkout attempts. Server checkout revalidates published prices, availability, cutoffs and quantities, with idempotency, lazy pickup-row creation and concurrency handling; legacy reserved attempts retain their reservation lifecycle. See [commerce architecture](commerce-architecture.md) and [inventory lifecycle](inventory-lifecycle.md). Sanity never stores authoritative transactional state.

Stripe's verified webhooks and server reconciliation are authoritative for payment completion. `/order/success` is a capability-protected read-only confirmation and clears a matching bag only when Stripe and Postgres verify payment. Hosted Checkout is test-only and is the default outside Draft Mode, which keeps the local preview flow. Tax decisions remain open.

Resend/React Email and optional-consent Twilio SMS remain deferred. No payment, database, messaging, account, or order integrations were introduced in Phase 2. Special-order form validation remains local; no request is sent or persisted.

## Time and uncertain rules

Pickup dates are Pacific calendar keys. Cutoffs have explicit DST-aware offsets. The site layout supplies the published recurring schedule with periodic client refreshes independently of Stripe configuration. No mock schedule feeds the storefront. Calendar navigation has no configured last month; the initial date window is only for the initial view and analytics. The configurable special-order minimum, fee and five-day lead-time rule remain code-owned; their displayed wording is editable and must remain accurate. See [open decisions](open-decisions.md).

## Editable navigation

Site Settings has independent `headerNavigation` and `footerNavigation` sortable arrays, each capped at seven items. Editors own menu labels, links and order separately. Desktop and mobile use the header array. Storage + reheating is a normal sortable footer item. Schema and runtime URL checks support internal paths, anchors and HTTP(S)/email/phone links; cleared or invalid items are omitted. The website owns responsive layout, link behavior and active states. Cart and privacy/terms labels remain separate utility copy. Empty footer lists do not fall back to header navigation, and no fixed storage link is appended.
