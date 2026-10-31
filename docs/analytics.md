# Checkout analytics

The existing GA4 integration sends these custom events to `G-FF1JFYJLTV`.
Every custom event includes `preview_mode: true` and
`flow_version: checkout_preview_v1`. No order, payment, or reservation is created.
There is deliberately no `purchase` event; visiting `/order/success` is only a
confirmation preview, including direct visits without a selected pickup date.

## Event definitions

| Event                      | Trigger                                                                                                                     | Parameters                                                                                                            |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `add_to_cart_blocked`      | A positive, whole-number add request exceeds the cart quantity limit or available stock, including items already in the bag | `item_id`, `item_variant`, `requested_quantity`, `cart_quantity`, `available_quantity`, `reason_code: quantity_limit` |
| `pickup_dates_unavailable` | The visible pickup step first shows no available dates for the complete cart                                                | `step_name: pickup`, `item_count`, `available_date_count: 0`                                                          |
| `pickup_date_selected`     | A customer selects a different, valid date for the whole order                                                              | `pickup_date`, `item_count`, `available_date_count`                                                                   |
| `checkout_step_view`       | The open drawer displays a different step, or is reopened                                                                   | `step_name: bag / pickup / payment_preview`, `item_count`, `available_date_count`                                     |
| `checkout_back`            | A customer uses Back or Edit your bag inside checkout                                                                       | `from_step`, `to_step`, `item_count`                                                                                  |
| `checkout_closed`          | A customer closes the drawer using the close button, Escape, outside click, or Keep shopping                                | `step_name`, `item_count`                                                                                             |
| `order_preview_view`       | The confirmation preview page mounts                                                                                        | `has_valid_pickup_date`                                                                                               |

`item_count` is total units, not distinct cart lines. `cart_quantity` is the
quantity already in the bag for the requested product and variant.
`available_quantity` is the maximum permitted total for that line, not the
remaining quantity. Missing dates can reflect quantities, missing inventory,
closed cutoffs, disabled dates, or a combination; the event does not guess a cause.

Step views do not repeat for quantity changes, date selection, ordinary rerenders,
or React Strict Mode effect replay. The unavailable event fires once per visible
unavailable state and can fire again after recovery or a new visit to pickup.
Navigation to product details or the confirmation preview does not emit
`checkout_closed`. Closing the drawer is an interaction, not proof of abandonment.

Only catalog identifiers, validated schedule dates, controlled status values,
and counts are included. No customer fields, raw error messages, prices, or
payment information are sent in these custom payloads. The transport uses the
existing Google queue, buffers events before its script loads, and isolates
analytics failures from checkout. It adds no storage or dependencies.
The root initializes GA before mounting the cart and page tracking components so
the configuration command precedes view events, including direct confirmation
visits.

## GA4 reporting setup

The application sends event names directly; do not create matching derived events
in GA4, which would duplicate them. With Editor access to the property, go to
**Admin → Data display → Custom definitions** and register event-scoped custom
dimensions for `step_name`, `from_step`, `to_step`, `reason_code`, `flow_version`,
`preview_mode`, and `has_valid_pickup_date` as needed for reports. Register
`item_id` and `item_variant` as event-scoped dimensions if you want to break down
the custom blocked-add event by product; these events are not ecommerce `items`
arrays. Add custom metrics for `item_count` and `available_date_count` if needed.
Avoid registering individual pickup dates unless date-level reporting is needed.

Build a funnel using `checkout_step_view` filtered to `bag`, then `pickup`, then
`payment_preview`, followed by `order_preview_view`. Compare mobile and desktop,
traffic sources, and users who encountered unavailable dates. Customers can add
items directly from the storefront, so a product detail page is not required.

No GA4 property settings or custom definitions are changed by this code.
Reporting setup reference:
[Create event-scoped custom dimensions](https://support.google.com/analytics/answer/14239696).

## Verification

1. Use a local browser with Google's script and collection endpoints blocked to
   avoid sending test activity to the property. Inspect commands in
   `window.dataLayer` and confirm each starts with `event` and the expected name.
2. Add a product, proceed to pickup, choose an enabled Friday, go back and
   forward, close and reopen the drawer, then visit the confirmation preview.
   Confirm each view fires once per visit and the selected date applies to the
   whole order. Confirmation navigation must not emit `checkout_closed`.
3. Fill a product variant to its maximum stock, close the bag, and attempt to add
   more. Confirm `add_to_cart_blocked` and no cart mutation.
4. Use a stored cart quantity exceeding current stock to show no valid dates.
   Confirm one `pickup_dates_unavailable` per visit, without duplicates when the
   drawer rerenders. Recover by editing the bag and lowering the quantity.
5. For a published build, use Tag Assistant/GA4 DebugView to verify receipt in
   the intended property. Browser queue checks alone do not prove GA4 receipt.

Live payments and their authoritative Stripe webhook tracking remain Phase 2.
