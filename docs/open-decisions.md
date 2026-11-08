# Open decisions before a live launch

Phase 3 commerce implementation and current launch gates are documented in [Phase 3 open decisions](phase-3-open-decisions.md). The table below preserves the earlier phase treatments and outstanding business approvals.

The approved launch revision uses published active products/sizes without stock caps and default-open future Fridays with published blackout dates in Sanity. Manual date opening, CMS weekly menus and allocations are retired; future capacity/menu automation is deferred. See [manual launch operations](manual-menu-launch.md). This supersedes the historical inventory/date-ownership treatments below.

These business decisions were recorded after Phase 2. Draft editorial content is now in Sanity; operational preview rules remain in `src/data`. The migration preserves existing approval notices.

| Decision                                     | Phase 1 treatment                                                                                                            |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Final inventory semantics                    | Typed mock rows per product, variant, pickup date; missing stock is unavailable                                              |
| Production capacity rules                    | Mock capacity only; no reservations, transactions, concurrency, or decrementing                                              |
| Pickup address and arrival instructions      | Rocklin, California; street address promised only after a future purchase                                                    |
| Cancellation policy                          | Visible TODO pending approval                                                                                                |
| Refund policy                                | Visible TODO pending approval                                                                                                |
| Missed-pickup policy                         | Visible TODO pending approval                                                                                                |
| Sales tax                                    | No tax claims or calculation; product subtotal only                                                                          |
| Special-order lead time                      | Configurable temporary five calendar days                                                                                    |
| Special-order capacity and approval          | Request → bakery review → approval → payment; no real submission                                                             |
| Special-order minimum and fee                | $40 product minimum + $10 additional fee, configured separately                                                              |
| SMS reminder timing                          | Deferred; future consent must be optional                                                                                    |
| Gift certificates and gift cards             | Deferred; confirm requirements before implementation                                                                         |
| Product ingredients                          | Obvious draft placeholders awaiting approval                                                                                 |
| Product allergens                            | No guessed allergen claims; visible approval notice                                                                          |
| Dietary classifications                      | Empty until confirmed                                                                                                        |
| Founder/about copy                           | Restrained draft brand copy; no invented biography or sourcing claims                                                        |
| Balgin files and license                     | Barlow Condensed fallback; isolated font config ready for licensed local files                                               |
| Final product photography                    | Intentional placehold.co assets labeled as placeholders                                                                      |
| Circular brand logo                          | Temporary typographic seal reserves its visual space                                                                         |
| Specialty sourdough flavors and loaf weights | Rotating placeholder description and weight approval note                                                                    |
| Seasonal flavors and release rules           | Placeholder product, currently sold out                                                                                      |
| Pickup date ownership                        | Future Sanity publication vs database schedule ownership needs a decision; completed orders and inventory stay transactional |
| Low-stock display thresholds                 | Example message when maximum future stock is three; final semantics require approval                                         |
| Pickup cutoff                                | Configured Wednesday 11:59 pm Pacific; confirm exceptions, holiday weeks, and time handling                                  |
| Recipes and testimonials                     | Three draft recipes and three clearly illustrative reviews; replace with approved material                                   |
| Legal policies                               | Draft privacy/terms, pending review before live launch                                                                       |
| Production launch metadata                   | Set production site URL, approved images, indexing, and final social cards                                                   |
