import { sql } from "drizzle-orm";
import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  date,
  time,
  timestamp,
  uniqueIndex,
  index,
  check,
  jsonb,
} from "drizzle-orm/pg-core";
import type Stripe from "stripe";
const timestamps = () => ({
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
export const pickupDates = pgTable(
  "pickup_dates",
  {
    id: uuid().defaultRandom().primaryKey(),
    date: date().notNull(),
    startTime: time("start_time").notNull(),
    endTime: time("end_time").notNull(),
    cutoffAt: timestamp("cutoff_at", { withTimezone: true }).notNull(),
    timezone: text().notNull().default("America/Los_Angeles"),
    enabled: boolean().notNull().default(false),
    // Retained only for historical menus/older checkout compatibility.
    sanityMenuId: text("sanity_menu_id"),
    sanityRevision: text("sanity_revision"),
    configurationSource: text("configuration_source", {
      enum: ["sanity_legacy", "manual"],
    })
      .notNull()
      .default("sanity_legacy"),
    ...timestamps(),
  },
  (t) => [
    uniqueIndex("pickup_date_unique").on(t.date),
    uniqueIndex("pickup_menu_unique").on(t.sanityMenuId),
    check("pickup_friday", sql`extract(isodow from ${t.date}) = 5`),
    check("pickup_window", sql`${t.startTime} < ${t.endTime}`),
    check(
      "pickup_configuration_source",
      sql`${t.configurationSource} in ('sanity_legacy','manual')`,
    ),
  ],
);
export const inventory = pgTable(
  "inventory",
  {
    id: uuid().defaultRandom().primaryKey(),
    pickupDateId: uuid("pickup_date_id")
      .notNull()
      .references(() => pickupDates.id),
    productId: text("product_id").notNull(),
    variantId: text("variant_id").notNull(),
    capacity: integer().notNull(),
    quantityReserved: integer("quantity_reserved").notNull().default(0),
    quantitySold: integer("quantity_sold").notNull().default(0),
    offered: boolean().notNull().default(true),
    ...timestamps(),
  },
  (t) => [
    uniqueIndex("inventory_identity").on(
      t.pickupDateId,
      t.productId,
      t.variantId,
    ),
    check(
      "inventory_counts",
      sql`${t.capacity} >= 0 and ${t.quantityReserved} >= 0 and ${t.quantitySold} >= 0 and ${t.quantityReserved} + ${t.quantitySold} <= ${t.capacity}`,
    ),
  ],
);
export const orders = pgTable(
  "orders",
  {
    id: uuid().defaultRandom().primaryKey(),
    orderNumber: text("order_number").notNull(),
    pickupDateId: uuid("pickup_date_id")
      .notNull()
      .references(() => pickupDates.id),
    customerName: text("customer_name"),
    customerEmail: text("customer_email"),
    customerPhone: text("customer_phone"),
    marketingOptIn: boolean("marketing_opt_in").notNull().default(false),
    marketingConsentAt: timestamp("marketing_consent_at", {
      withTimezone: true,
    }),
    marketingConsentSource: text("marketing_consent_source"),
    marketingConsentVersion: text("marketing_consent_version"),
    marketingConsentText: text("marketing_consent_text"),
    subtotalCents: integer("subtotal_cents").notNull(),
    totalCents: integer("total_cents").notNull(),
    currency: text().notNull().default("usd"),
    paymentStatus: text("payment_status", {
      enum: ["pending", "paid", "partially_refunded", "refunded"],
    })
      .notNull()
      .default("pending"),
    orderStatus: text("order_status", {
      enum: ["pending", "confirmed", "cancelled", "fulfilled"],
    })
      .notNull()
      .default("pending"),
    stripeCheckoutSessionId: text("stripe_checkout_session_id"),
    stripePaymentIntentId: text("stripe_payment_intent_id"),
    ownerHash: text("owner_hash").notNull(),
    paymentReconciledAt: timestamp("payment_reconciled_at", {
      withTimezone: true,
    }),
    notificationStatus: text("notification_status")
      .notNull()
      .default("not_scheduled"),
    ...timestamps(),
  },
  (t) => [
    uniqueIndex("order_number_unique").on(t.orderNumber),
    check(
      "order_marketing_consent",
      sql`
      (${t.marketingOptIn} = false
        and ${t.marketingConsentAt} is null
        and ${t.marketingConsentSource} is null
        and ${t.marketingConsentVersion} is null
        and ${t.marketingConsentText} is null)
      or (${t.marketingOptIn} = true
        and ${t.marketingConsentAt} is not null
        and ${t.marketingConsentSource} is not null
        and ${t.marketingConsentSource} = 'checkout_drawer'
        and ${t.marketingConsentVersion} is not null
        and ${t.marketingConsentVersion} ~ '^[a-f0-9]{64}$'
        and ${t.marketingConsentText} is not null
        and char_length(trim(${t.marketingConsentText})) between 1 and 2000)
    `,
    ),
    uniqueIndex("order_session_unique").on(t.stripeCheckoutSessionId),
    uniqueIndex("order_intent_unique").on(t.stripePaymentIntentId),
    index("orders_pickup_payment").on(t.pickupDateId, t.paymentStatus),
    check(
      "order_money",
      sql`${t.subtotalCents} > 0 and ${t.totalCents} = ${t.subtotalCents} and ${t.currency} = 'usd'`,
    ),
    check(
      "order_payment_state",
      sql`${t.paymentStatus} in ('pending','paid','partially_refunded','refunded')`,
    ),
    check(
      "order_status_state",
      sql`${t.orderStatus} in ('pending','confirmed','cancelled','fulfilled')`,
    ),
  ],
);
export const checkoutAttempts = pgTable(
  "checkout_attempts",
  {
    id: uuid().primaryKey(),
    inventoryMode: text("inventory_mode", { enum: ["reserved", "uncapped"] })
      .notNull()
      .default("reserved"),
    requestKey: uuid("request_key").notNull(),
    fingerprint: text().notNull(),
    ownerHash: text("owner_hash").notNull(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id),
    stripeCheckoutSessionId: text("stripe_checkout_session_id"),
    status: text({ enum: ["creating", "open", "paid", "expired", "failed"] })
      .notNull()
      .default("creating"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    stripeParams: jsonb("stripe_params")
      .$type<Stripe.Checkout.SessionCreateParams>()
      .notNull(),
    ...timestamps(),
  },
  (t) => [
    uniqueIndex("checkout_request_unique").on(t.requestKey),
    uniqueIndex("checkout_order_unique").on(t.orderId),
    uniqueIndex("checkout_session_unique").on(t.stripeCheckoutSessionId),
    index("checkout_reconcile").on(t.status, t.expiresAt),
    index("checkout_owner").on(t.ownerHash),
    check(
      "checkout_inventory_mode",
      sql`${t.inventoryMode} in ('reserved','uncapped')`,
    ),
    check(
      "checkout_state",
      sql`${t.status} in ('creating','open','paid','expired','failed')`,
    ),
  ],
);
export const orderItems = pgTable(
  "order_items",
  {
    id: uuid().defaultRandom().primaryKey(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id),
    productId: text("product_id").notNull(),
    variantId: text("variant_id").notNull(),
    productNameSnapshot: text("product_name_snapshot").notNull(),
    variantNameSnapshot: text("variant_name_snapshot").notNull(),
    unitPriceCents: integer("unit_price_cents").notNull(),
    quantity: integer().notNull(),
    lineTotalCents: integer("line_total_cents").notNull(),
  },
  (t) => [
    uniqueIndex("order_item_identity").on(t.orderId, t.productId, t.variantId),
    check(
      "item_money",
      sql`${t.quantity} between 1 and 20 and ${t.unitPriceCents} >= 0 and ${t.lineTotalCents} = ${t.unitPriceCents} * ${t.quantity}`,
    ),
  ],
);
export const reservations = pgTable(
  "inventory_reservations",
  {
    id: uuid().defaultRandom().primaryKey(),
    checkoutAttemptId: uuid("checkout_attempt_id")
      .notNull()
      .references(() => checkoutAttempts.id),
    inventoryId: uuid("inventory_id")
      .notNull()
      .references(() => inventory.id),
    quantity: integer().notNull(),
    status: text({ enum: ["active", "sold", "released"] })
      .notNull()
      .default("active"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    ...timestamps(),
  },
  (t) => [
    uniqueIndex("reservation_identity").on(t.checkoutAttemptId, t.inventoryId),
    index("reservation_status_expiry").on(t.status, t.expiresAt),
    check("reservation_quantity", sql`${t.quantity} > 0`),
    check(
      "reservation_state",
      sql`${t.status} in ('active','sold','released')`,
    ),
  ],
);
export const processedStripeEvents = pgTable("processed_stripe_events", {
  stripeEventId: text("stripe_event_id").primaryKey(),
  eventType: text("event_type").notNull(),
  processedAt: timestamp("processed_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  result: text().notNull(),
});
export const syncRuns = pgTable("inventory_sync_runs", {
  id: uuid().defaultRandom().primaryKey(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  status: text().notNull(),
  message: text(),
});

export const checkoutRateLimits = pgTable("checkout_rate_limits", {
  key: text().primaryKey(),
  windowStart: timestamp("window_start", { withTimezone: true }).notNull(),
  requests: integer().notNull(),
});

export const marketingSubscriptions = pgTable(
  "marketing_subscriptions",
  {
    id: uuid().defaultRandom().primaryKey(),
    email: text().notNull(),
    subscribed: boolean().notNull().default(false),
    lastConsentOrderId: uuid("last_consent_order_id").references(
      () => orders.id,
    ),
    lastConsentAt: timestamp("last_consent_at", { withTimezone: true }),
    unsubscribedAt: timestamp("unsubscribed_at", { withTimezone: true }),
    unsubscribeSource: text("unsubscribe_source"),
    ...timestamps(),
  },
  (t) => [
    uniqueIndex("marketing_email_unique").on(t.email),
    index("marketing_subscribed").on(t.subscribed),
    check(
      "marketing_normalized_email",
      sql`${t.email} = lower(trim(${t.email})) and char_length(${t.email}) between 3 and 254`,
    ),
    check(
      "marketing_preference_state",
      sql`
    (${t.subscribed} = true and ${t.lastConsentOrderId} is not null and ${t.lastConsentAt} is not null and ${t.unsubscribedAt} is null and ${t.unsubscribeSource} is null)
    or (${t.subscribed} = false and ${t.unsubscribedAt} is not null and ${t.unsubscribeSource} is not null and ${t.unsubscribeSource} in ('public_form','signed_link'))
  `,
    ),
  ],
);
