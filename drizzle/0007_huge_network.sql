CREATE TABLE "pickup_reminders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"payload" jsonb NOT NULL,
	"first_attempt_at" timestamp with time zone NOT NULL,
	"lease_id" uuid,
	"lease_until" timestamp with time zone,
	"provider_id" text,
	"sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pickup_reminder_status" CHECK ("pickup_reminders"."status" in ('pending','sending','sent','review')),
	CONSTRAINT "pickup_reminder_sent" CHECK ("pickup_reminders"."status" <> 'sent' or ("pickup_reminders"."provider_id" is not null and "pickup_reminders"."sent_at" is not null))
);
--> statement-breakpoint
ALTER TABLE "pickup_reminders" ADD CONSTRAINT "pickup_reminders_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "pickup_reminder_order" ON "pickup_reminders" USING btree ("order_id");