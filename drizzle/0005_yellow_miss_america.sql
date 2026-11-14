CREATE TABLE "order_emails" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"audience" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"payload" jsonb,
	"first_attempt_at" timestamp with time zone,
	"lease_id" uuid,
	"lease_until" timestamp with time zone,
	"provider_id" text,
	"sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "order_email_audience_check" CHECK ("order_emails"."audience" in ('customer','business')),
	CONSTRAINT "order_email_status" CHECK ("order_emails"."status" in ('pending','sending','sent','review')),
	CONSTRAINT "order_email_sent" CHECK ("order_emails"."status" <> 'sent' or ("order_emails"."provider_id" is not null and "order_emails"."sent_at" is not null))
);
--> statement-breakpoint
ALTER TABLE "order_emails" ADD CONSTRAINT "order_emails_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "order_email_audience" ON "order_emails" USING btree ("order_id","audience");--> statement-breakpoint
CREATE INDEX "order_email_pending" ON "order_emails" USING btree ("status","updated_at");