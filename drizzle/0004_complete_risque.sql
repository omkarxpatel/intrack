ALTER TABLE "applications" ADD COLUMN "starred" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "has_referral" boolean DEFAULT false NOT NULL;