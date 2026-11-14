CREATE TABLE "special_order_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_key" uuid NOT NULL,
	"fingerprint" text NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text NOT NULL,
	"requested_date" date NOT NULL,
	"products" text NOT NULL,
	"marketing_opt_in" boolean DEFAULT false NOT NULL,
	"marketing_consent_at" timestamp with time zone,
	"marketing_consent_source" text,
	"marketing_consent_version" text,
	"marketing_consent_text" text,
	"notification_status" text DEFAULT 'pending' NOT NULL,
	"notification_payload" jsonb,
	"first_attempt_at" timestamp with time zone,
	"lease_id" uuid,
	"lease_until" timestamp with time zone,
	"provider_id" text,
	"sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "special_order_contact" CHECK (char_length(trim("special_order_requests"."name")) between 2 and 120 and char_length("special_order_requests"."email") between 3 and 254 and "special_order_requests"."email" = lower(trim("special_order_requests"."email")) and char_length("special_order_requests"."phone") between 10 and 30 and char_length(trim("special_order_requests"."products")) between 10 and 3000),
	CONSTRAINT "special_order_consent" CHECK (
      ("special_order_requests"."marketing_opt_in" = false and "special_order_requests"."marketing_consent_at" is null and "special_order_requests"."marketing_consent_source" is null and "special_order_requests"."marketing_consent_version" is null and "special_order_requests"."marketing_consent_text" is null)
      or ("special_order_requests"."marketing_opt_in" = true and "special_order_requests"."marketing_consent_at" is not null and "special_order_requests"."marketing_consent_source" is not null and "special_order_requests"."marketing_consent_source" = 'special_order_form' and "special_order_requests"."marketing_consent_version" is not null and "special_order_requests"."marketing_consent_version" ~ '^[a-f0-9]{64}$' and "special_order_requests"."marketing_consent_text" is not null and char_length(trim("special_order_requests"."marketing_consent_text")) between 1 and 2000)
    ),
	CONSTRAINT "special_order_notification_status" CHECK ("special_order_requests"."notification_status" in ('pending','sending','sent','review')),
	CONSTRAINT "special_order_notification_sent" CHECK ("special_order_requests"."notification_status" <> 'sent' or ("special_order_requests"."provider_id" is not null and "special_order_requests"."sent_at" is not null))
);
--> statement-breakpoint
ALTER TABLE "marketing_subscriptions" DROP CONSTRAINT "marketing_preference_state";--> statement-breakpoint
ALTER TABLE "marketing_subscriptions" ADD COLUMN "last_consent_special_order_id" uuid;--> statement-breakpoint
CREATE UNIQUE INDEX "special_order_request_key" ON "special_order_requests" USING btree ("request_key");--> statement-breakpoint
CREATE INDEX "special_order_notification_pending" ON "special_order_requests" USING btree ("notification_status","updated_at");--> statement-breakpoint
ALTER TABLE "marketing_subscriptions" ADD CONSTRAINT "marketing_subscriptions_last_consent_special_order_id_special_order_requests_id_fk" FOREIGN KEY ("last_consent_special_order_id") REFERENCES "public"."special_order_requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketing_subscriptions" ADD CONSTRAINT "marketing_preference_state" CHECK (
    ("marketing_subscriptions"."subscribed" = true and num_nonnulls("marketing_subscriptions"."last_consent_order_id", "marketing_subscriptions"."last_consent_special_order_id") = 1 and "marketing_subscriptions"."last_consent_at" is not null and "marketing_subscriptions"."unsubscribed_at" is null and "marketing_subscriptions"."unsubscribe_source" is null)
    or ("marketing_subscriptions"."subscribed" = false and "marketing_subscriptions"."unsubscribed_at" is not null and "marketing_subscriptions"."unsubscribe_source" is not null and "marketing_subscriptions"."unsubscribe_source" in ('public_form','signed_link'))
  );