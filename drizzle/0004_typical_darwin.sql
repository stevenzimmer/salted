ALTER TABLE "pickup_dates" ALTER COLUMN "sanity_menu_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "pickup_dates" ALTER COLUMN "sanity_revision" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "checkout_attempts" ADD COLUMN "inventory_mode" text DEFAULT 'reserved' NOT NULL;--> statement-breakpoint
ALTER TABLE "pickup_dates" ADD COLUMN "configuration_source" text DEFAULT 'sanity_legacy' NOT NULL;--> statement-breakpoint
ALTER TABLE "checkout_attempts" ADD CONSTRAINT "checkout_inventory_mode" CHECK ("checkout_attempts"."inventory_mode" in ('reserved','uncapped'));--> statement-breakpoint
ALTER TABLE "pickup_dates" ADD CONSTRAINT "pickup_configuration_source" CHECK ("pickup_dates"."configuration_source" in ('sanity_legacy','manual'));