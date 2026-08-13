CREATE TYPE "public"."term_season" AS ENUM('spring', 'summer', 'fall', 'winter');--> statement-breakpoint
CREATE TABLE "role_presets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"role" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "applications" ALTER COLUMN "term" SET DATA TYPE "public"."term_season" USING (
	CASE lower(split_part(trim("term"), ' ', 1))
		WHEN 'spring' THEN 'spring'
		WHEN 'summer' THEN 'summer'
		WHEN 'fall' THEN 'fall'
		WHEN 'autumn' THEN 'fall'
		WHEN 'winter' THEN 'winter'
		ELSE NULL
	END
)::"public"."term_season";--> statement-breakpoint
CREATE UNIQUE INDEX "role_presets_user_role_idx" ON "role_presets" USING btree ("user_id","role");