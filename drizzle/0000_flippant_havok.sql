CREATE TABLE "checkout_attempts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"request_key" uuid NOT NULL,
	"fingerprint" text NOT NULL,
	"owner_hash" text NOT NULL,
	"order_id" uuid NOT NULL,
	"stripe_checkout_session_id" text,
	"status" text DEFAULT 'creating' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"stripe_params" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "checkout_state" CHECK ("checkout_attempts"."status" in ('creating','open','paid','expired','failed'))
);
--> statement-breakpoint
CREATE TABLE "inventory" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pickup_date_id" uuid NOT NULL,
	"product_id" text NOT NULL,
	"variant_id" text NOT NULL,
	"capacity" integer NOT NULL,
	"quantity_reserved" integer DEFAULT 0 NOT NULL,
	"quantity_sold" integer DEFAULT 0 NOT NULL,
	"offered" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "inventory_counts" CHECK ("inventory"."capacity" >= 0 and "inventory"."quantity_reserved" >= 0 and "inventory"."quantity_sold" >= 0 and "inventory"."quantity_reserved" + "inventory"."quantity_sold" <= "inventory"."capacity")
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"product_id" text NOT NULL,
	"variant_id" text NOT NULL,
	"product_name_snapshot" text NOT NULL,
	"variant_name_snapshot" text NOT NULL,
	"unit_price_cents" integer NOT NULL,
	"quantity" integer NOT NULL,
	"line_total_cents" integer NOT NULL,
	CONSTRAINT "item_money" CHECK ("order_items"."quantity" between 1 and 20 and "order_items"."unit_price_cents" >= 0 and "order_items"."line_total_cents" = "order_items"."unit_price_cents" * "order_items"."quantity")
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_number" text NOT NULL,
	"pickup_date_id" uuid NOT NULL,
	"customer_name" text,
	"customer_email" text,
	"customer_phone" text,
	"subtotal_cents" integer NOT NULL,
	"total_cents" integer NOT NULL,
	"currency" text DEFAULT 'usd' NOT NULL,
	"payment_status" text DEFAULT 'pending' NOT NULL,
	"order_status" text DEFAULT 'pending' NOT NULL,
	"stripe_checkout_session_id" text,
	"stripe_payment_intent_id" text,
	"owner_hash" text NOT NULL,
	"notification_status" text DEFAULT 'not_scheduled' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "order_money" CHECK ("orders"."subtotal_cents" > 0 and "orders"."total_cents" = "orders"."subtotal_cents" and "orders"."currency" = 'usd'),
	CONSTRAINT "order_payment_state" CHECK ("orders"."payment_status" in ('pending','paid','partially_refunded','refunded')),
	CONSTRAINT "order_status_state" CHECK ("orders"."order_status" in ('pending','confirmed','cancelled','fulfilled'))
);
--> statement-breakpoint
CREATE TABLE "pickup_dates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"date" date NOT NULL,
	"start_time" time NOT NULL,
	"end_time" time NOT NULL,
	"cutoff_at" timestamp with time zone NOT NULL,
	"timezone" text DEFAULT 'America/Los_Angeles' NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"sanity_menu_id" text NOT NULL,
	"sanity_revision" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pickup_friday" CHECK (extract(isodow from "pickup_dates"."date") = 5),
	CONSTRAINT "pickup_window" CHECK ("pickup_dates"."start_time" < "pickup_dates"."end_time")
);
--> statement-breakpoint
CREATE TABLE "processed_stripe_events" (
	"stripe_event_id" text PRIMARY KEY NOT NULL,
	"event_type" text NOT NULL,
	"processed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"result" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inventory_reservations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"checkout_attempt_id" uuid NOT NULL,
	"inventory_id" uuid NOT NULL,
	"quantity" integer NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reservation_quantity" CHECK ("inventory_reservations"."quantity" > 0),
	CONSTRAINT "reservation_state" CHECK ("inventory_reservations"."status" in ('active','sold','released'))
);
--> statement-breakpoint
CREATE TABLE "inventory_sync_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"status" text NOT NULL,
	"message" text
);
--> statement-breakpoint
ALTER TABLE "checkout_attempts" ADD CONSTRAINT "checkout_attempts_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_pickup_date_id_pickup_dates_id_fk" FOREIGN KEY ("pickup_date_id") REFERENCES "public"."pickup_dates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_pickup_date_id_pickup_dates_id_fk" FOREIGN KEY ("pickup_date_id") REFERENCES "public"."pickup_dates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_reservations" ADD CONSTRAINT "inventory_reservations_checkout_attempt_id_checkout_attempts_id_fk" FOREIGN KEY ("checkout_attempt_id") REFERENCES "public"."checkout_attempts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_reservations" ADD CONSTRAINT "inventory_reservations_inventory_id_inventory_id_fk" FOREIGN KEY ("inventory_id") REFERENCES "public"."inventory"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "checkout_request_unique" ON "checkout_attempts" USING btree ("request_key");--> statement-breakpoint
CREATE UNIQUE INDEX "checkout_order_unique" ON "checkout_attempts" USING btree ("order_id");--> statement-breakpoint
CREATE UNIQUE INDEX "checkout_session_unique" ON "checkout_attempts" USING btree ("stripe_checkout_session_id");--> statement-breakpoint
CREATE INDEX "checkout_reconcile" ON "checkout_attempts" USING btree ("status","expires_at");--> statement-breakpoint
CREATE INDEX "checkout_owner" ON "checkout_attempts" USING btree ("owner_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "inventory_identity" ON "inventory" USING btree ("pickup_date_id","product_id","variant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "order_item_identity" ON "order_items" USING btree ("order_id","product_id","variant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "order_number_unique" ON "orders" USING btree ("order_number");--> statement-breakpoint
CREATE UNIQUE INDEX "order_session_unique" ON "orders" USING btree ("stripe_checkout_session_id");--> statement-breakpoint
CREATE UNIQUE INDEX "order_intent_unique" ON "orders" USING btree ("stripe_payment_intent_id");--> statement-breakpoint
CREATE INDEX "orders_pickup_payment" ON "orders" USING btree ("pickup_date_id","payment_status");--> statement-breakpoint
CREATE UNIQUE INDEX "pickup_date_unique" ON "pickup_dates" USING btree ("date");--> statement-breakpoint
CREATE UNIQUE INDEX "pickup_menu_unique" ON "pickup_dates" USING btree ("sanity_menu_id");--> statement-breakpoint
CREATE UNIQUE INDEX "reservation_identity" ON "inventory_reservations" USING btree ("checkout_attempt_id","inventory_id");--> statement-breakpoint
CREATE INDEX "reservation_status_expiry" ON "inventory_reservations" USING btree ("status","expires_at");