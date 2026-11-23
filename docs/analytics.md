# Website analytics

The existing GA4 integration sends the standard `add_to_cart` event and the
custom events below to `G-FF1JFYJLTV`.
Checkout events include `preview_mode: true` and
`flow_version: checkout_preview_v1` for compatibility with existing reporting.
Product-filter and special-order events do not include those flags. Analytics
creates no orders or payments and sends no `purchase` event. Visiting
`/order/success` does not send a confirmation-view event or prove payment.

## Event definitions

### Standard ecommerce event

`add_to_cart` fires once after a successful **Add to bag** action on the storefront
or a product detail page. It sends `currency: USD`, `value`, and an `items` array
containing `item_id`, `item_name`, `item_variant`, `item_category`, `price`, and
`quantity`. Quantity and value describe only the units added in that action,
not the accumulated bag. Prices come from the typed catalog in integer cents
and convert to dollars only in the GA4 payload. Tax and shipping are excluded.

Blocked attempts emit only `add_to_cart_blocked`. Loading a saved bag, changing
quantity within the bag, opening the drawer, or rerendering does not emit this
event. Standard ecommerce parameters do not need custom dimension registration.
See [Google's add_to_cart reference](https://developers.google.com/analytics/devguides/collection/ga4/reference/events#add_to_cart).

### Custom events

| Event                      | Trigger                                                                                                  | Parameters                                                                                                            |
| -------------------------- | -------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `add_to_cart_blocked`      | A positive, whole-number add request exceeds the cart quantity limit, including items already in the bag | `item_id`, `item_variant`, `requested_quantity`, `cart_quantity`, `available_quantity`, `reason_code: quantity_limit` |
| `pickup_dates_unavailable` | The visible pickup step first shows no available dates for the complete cart                             | `step_name: pickup`, `item_count`, `available_date_count: 0`                                                          |
| `pickup_date_selected`     | A customer selects a different, valid date for the whole order                                           | `pickup_date`, `item_count`, `available_date_count`                                                                   |
| `checkout_step_view`       | The open drawer displays a different step, or is reopened                                                | `step_name: bag / pickup / payment_preview`, `item_count`, `available_date_count`                                     |
| `checkout_back`            | A customer uses Back or Edit your bag inside checkout                                                    | `from_step`, `to_step`, `item_count`                                                                                  |
| `checkout_closed`          | A customer closes the drawer using the close button, Escape, outside click, or Keep shopping             | `step_name`, `item_count`                                                                                             |

`item_count` is total units, not distinct cart lines. `cart_quantity` is the
quantity already in the bag for the requested product and variant.
`available_quantity` is the maximum permitted total for that line, not the
remaining quantity. Pickup availability follows the complete cart, published blackout dates and
Pacific cutoffs; the event does not guess a cause.

Step views do not repeat for quantity changes, date selection, ordinary rerenders,
or React Strict Mode effect replay. The unavailable event fires once per visible
unavailable state and can fire again after recovery or a new visit to pickup.
Navigation to product details or the confirmation preview does not emit
`checkout_closed`. Closing the drawer is an interaction, not proof of abandonment.

Only catalog identifiers, product names, validated schedule dates, controlled
status values, and counts are included, plus catalog prices and value for the
standard ecommerce event. No customer fields, raw error messages, or payment
information are sent. The transport uses the
existing Google queue, buffers events before its script loads, and isolates
analytics failures from checkout. It adds no storage or dependencies.
The website layout initializes GA before mounting the cart and page components.

## Storefront filters

`product_filter_select` fires when a customer selects a different visible filter
on the homepage, including returning to the all-products filter. Initial rendering,
rerenders and repeated clicks on the currently selected filter send no event.
Keyboard activation uses the same handler as pointer clicks.

Parameters: `filter_id` (CMS filter key), `filter_label` (cleaned CMS label),
`category_id` (category document ID, or `all` when `show_all` is true),
`show_all` (boolean), and `result_count` (products displayed by that filter).
`show_all` distinguishes the all-products filter from a category whose ID is `all`.
Labels may change; use IDs for comparisons across copy edits. Empty result sets
send `result_count: 0`.

The former preview-view event has been removed; historical GA data is retained.
For special-order start and successful-submit events, see [special orders](special-orders.md#google-analytics).

## GA4 reporting setup

The application sends event names directly; do not create matching derived events
in GA4, which would duplicate them. With Editor access to the property, go to
**Admin → Data display → Custom definitions** and register event-scoped custom
dimensions for `step_name`, `from_step`, `to_step`, `reason_code`, `flow_version`,
and `preview_mode` as needed for reports. Register
`item_id` and `item_variant` as event-scoped dimensions if you want to break down
the custom blocked-add event by product; these events are not ecommerce `items`
arrays. Add custom metrics for `item_count` and `available_date_count` if needed.
Avoid registering individual pickup dates unless date-level reporting is needed.
For filter reporting, register event-scoped dimensions for `filter_id`,
`filter_label`, `category_id` and `show_all`, and a custom metric for `result_count`
if needed. Collection starts after deployment; custom definitions are GA Admin
configuration and do not backfill prior activity.

Build a funnel using `checkout_step_view` filtered to `bag`, then `pickup`, then
`payment_preview`. Compare mobile and desktop,
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
   Confirm one `add_to_cart` per successful Add to bag action with the correct
   added quantity and USD value, including repeated adds to an existing line.
   Confirm each view fires once per visit and the selected date applies to the
   whole order. Confirmation navigation must not emit `checkout_closed`.
3. Fill a product variant to its per-line quantity limit, close the bag, and attempt to add
   more. Confirm `add_to_cart_blocked`, no `add_to_cart`, and no cart mutation.
4. With an isolated schedule fixture containing no eligible dates, confirm one
   `pickup_dates_unavailable` per visit without duplicates when the drawer rerenders.
5. For a published build, use Tag Assistant/GA4 DebugView to verify receipt in
   the intended property. Browser queue checks alone do not prove GA4 receipt.
6. Change storefront filters with pointer and keyboard controls. Confirm one
   `product_filter_select` per change, the displayed product count, and no events
   on initial rendering or repeated clicks on the selected filter.

Payment completion remains authoritative only through verified Stripe webhooks
and server-side reconciliation.
