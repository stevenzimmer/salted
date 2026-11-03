# Integration boundaries

Sanity is authoritative for editorial content. App Router Server Components use centralized generated GROQ query types and `sanityFetch` from `defineLive`. Small mappers preserve the existing product/recipe prop contracts and encoded editorial strings. Shared settings, commerce copy, and catalog content use a request-deduplicated server fetch; interaction boundaries remain small.

The website and embedded Studio have separate root layouts. Only the website renders `SanityLive`; only authenticated Draft Mode renders `VisualEditing`. The official preview-secret handshake protects Draft Mode. Read tokens and compatibility aliases are server-only. Text source maps survive mapping and rendering. Image annotations include document ID, type, and exact field path. Clean strings only when checking presence or crossing structural/metadata/accessibility boundaries.

The CMS is a fixed content model, not a page builder. See [content map](cms-content-map.md) and [README](../README.md). Do not reintroduce local production copy or permanent fallback imagery. Empty editorial content collapses at the appropriate wrapper boundary.

## One order, one pickup date

A cart line stays `{productId, variantId, quantity}`. The browser persists no prices or pickup dates. Storage validates shape; the current CMS catalog filters removed products/variants, and totals use catalog integer-cent prices. Browser prices are still previews, never authoritative for future payments.

The operational calendar and inventory stay in code in this phase. `validPickupDates` checks the complete cart, aggregated quantities, enabled dates, Pacific cutoffs and inventory. Missing inventory means unavailable, including newly added CMS products. Separate pickup dates require separate orders. No capacity is reserved or decremented.

## Future transactional ownership

Postgres will own orders, immutable item snapshots, payment state, inventory, reservations, special-order workflow, and notification delivery state. Production checkout must revalidate prices, availability, cutoffs and quantities on the server, with atomic reservations, expiry, idempotency and concurrency handling. Sanity never stores authoritative transactional state.

Stripe's verified webhooks will be authoritative for payment completion. `/order/success` remains an explicitly labeled local confirmation preview, preserves the bag, and proves nothing about payment. Tax decisions remain open.

Resend/React Email and optional-consent Twilio SMS remain deferred. No payment, database, messaging, account, or order integrations were introduced in Phase 2. Special-order form validation remains local; no request is sent or persisted.

## Time and uncertain rules

Pickup dates are Pacific calendar keys. Cutoffs have explicit DST-aware offsets. The same rolling preview schedule is sent from the dynamic site layout to client interactions. The configurable special-order minimum, fee and five-day lead-time rule remain code-owned; their displayed wording is editable and must remain accurate. See [open decisions](open-decisions.md).
