CREATE TABLE "marketing_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"subscribed" boolean DEFAULT false NOT NULL,
	"last_consent_order_id" uuid,
	"last_consent_at" timestamp with time zone,
	"unsubscribed_at" timestamp with time zone,
	"unsubscribe_source" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "marketing_normalized_email" CHECK ("marketing_subscriptions"."email" = lower(trim("marketing_subscriptions"."email")) and char_length("marketing_subscriptions"."email") between 3 and 254),
	CONSTRAINT "marketing_preference_state" CHECK (
    ("marketing_subscriptions"."subscribed" = true and "marketing_subscriptions"."last_consent_order_id" is not null and "marketing_subscriptions"."last_consent_at" is not null and "marketing_subscriptions"."unsubscribed_at" is null and "marketing_subscriptions"."unsubscribe_source" is null)
    or ("marketing_subscriptions"."subscribed" = false and "marketing_subscriptions"."unsubscribed_at" is not null and "marketing_subscriptions"."unsubscribe_source" is not null and "marketing_subscriptions"."unsubscribe_source" in ('public_form','signed_link'))
  )
);
--> statement-breakpoint
ALTER TABLE "marketing_subscriptions" ADD CONSTRAINT "marketing_subscriptions_last_consent_order_id_orders_id_fk" FOREIGN KEY ("last_consent_order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "marketing_email_unique" ON "marketing_subscriptions" USING btree ("email");--> statement-breakpoint
CREATE INDEX "marketing_subscribed" ON "marketing_subscriptions" USING btree ("subscribed");
--> statement-breakpoint
-- Initialize current status only from affirmative, verified-payment evidence.
-- Orders retain their original consent snapshots. Never overwrite an opt-out.
INSERT INTO "marketing_subscriptions" ("email", "subscribed", "last_consent_order_id", "last_consent_at")
SELECT DISTINCT ON (lower(trim("customer_email")))
  lower(trim("customer_email")), true, "id", "marketing_consent_at"
FROM "orders"
WHERE "marketing_opt_in" = true
  AND "marketing_consent_at" IS NOT NULL
  AND "payment_status" IN ('paid', 'partially_refunded', 'refunded')
  AND "customer_email" IS NOT NULL
  AND char_length(trim("customer_email")) BETWEEN 3 AND 254
  AND trim("customer_email") LIKE '%@%'
ORDER BY lower(trim("customer_email")), "marketing_consent_at" DESC, "id"
ON CONFLICT ("email") DO NOTHING;
