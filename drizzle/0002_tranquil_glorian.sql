ALTER TABLE "orders" ADD COLUMN "marketing_opt_in" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "marketing_consent_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "marketing_consent_source" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "marketing_consent_version" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "marketing_consent_text" text;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "order_marketing_consent" CHECK (
      ("orders"."marketing_opt_in" = false
        and "orders"."marketing_consent_at" is null
        and "orders"."marketing_consent_source" is null
        and "orders"."marketing_consent_version" is null
        and "orders"."marketing_consent_text" is null)
      or ("orders"."marketing_opt_in" = true
        and "orders"."marketing_consent_at" is not null
        and "orders"."marketing_consent_source" is not null
        and "orders"."marketing_consent_source" = 'checkout_drawer'
        and "orders"."marketing_consent_version" is not null
        and "orders"."marketing_consent_version" ~ '^[a-f0-9]{64}$'
        and "orders"."marketing_consent_text" is not null
        and char_length(trim("orders"."marketing_consent_text")) between 1 and 2000)
    );