# Launch ordering and legacy inventory lifecycle

Launch stock caps and CMS Friday menus/planned allocations have been removed at the user’s request. Published active products/sizes form the menu on every manually opened Friday. Read [manual launch operations](manual-menu-launch.md) for setup, date commands, migration and tests.

New `uncapped` attempts create pending orders and validated item/price snapshots without stock or hold writes. Paid completion needs verified Stripe state and idempotent transaction handling, but no reservation row. Explicit null availability means no stock cap; missing offerings still fail closed. The existing per-line quantity/input limits and Wednesday Pacific cutoff remain.

Legacy `reserved` attempts retain their original inventory lifecycle. Active holds become sold only after a verified paid Session and matching local order. Confirmed expiration or definitive creation failure releases only unpaid active holds. Unknown Stripe network outcomes retain legacy holds until reconciliation proves the outcome. Duplicate/out-of-order events cannot sell twice or revert paid state. A reserved attempt missing its holds cannot be fulfilled through the uncapped path.

No inventory table, reservation, sold counter or order is deleted by the migration. Manual date commands never change counters. Closing a Friday stops new orders, while already-payable Sessions keep their original commitment. Refunds change financial state and never restock automatically.

The five-minute authenticated scheduler reconciles interrupted creation, expiration, payment/refund notifications and old rate-limit records. It does not synchronize CMS menus, initialize inventory or open future dates. Keep it running with payments disabled so older Sessions can settle safely.
