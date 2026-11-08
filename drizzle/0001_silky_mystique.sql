CREATE TABLE "checkout_rate_limits" (
	"key" text PRIMARY KEY NOT NULL,
	"window_start" timestamp with time zone NOT NULL,
	"requests" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "payment_reconciled_at" timestamp with time zone;