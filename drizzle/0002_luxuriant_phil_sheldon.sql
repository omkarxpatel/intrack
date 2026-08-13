ALTER TABLE "applications" ALTER COLUMN "status" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "applications" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "status_events" ALTER COLUMN "from_status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "status_events" ALTER COLUMN "to_status" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."application_status";--> statement-breakpoint
CREATE TYPE "public"."application_status" AS ENUM('upcoming', 'applied', 'online_assessment', 'interview_stage_1', 'interview_stage_2', 'interview_stage_3', 'interview_stage_4', 'interview_stage_5', 'interview_final', 'offered', 'accepted', 'withdrawn', 'rejected');--> statement-breakpoint
UPDATE "applications" SET "status" = CASE "status"
	WHEN 'saved' THEN 'upcoming'
	WHEN 'interview' THEN 'interview_stage_1'
	WHEN 'offer' THEN 'offered'
	WHEN 'ghosted' THEN 'rejected'
	ELSE "status" END;--> statement-breakpoint
UPDATE "status_events" SET "to_status" = CASE "to_status"
	WHEN 'saved' THEN 'upcoming'
	WHEN 'interview' THEN 'interview_stage_1'
	WHEN 'offer' THEN 'offered'
	WHEN 'ghosted' THEN 'rejected'
	ELSE "to_status" END;--> statement-breakpoint
UPDATE "status_events" SET "from_status" = CASE "from_status"
	WHEN 'saved' THEN 'upcoming'
	WHEN 'interview' THEN 'interview_stage_1'
	WHEN 'offer' THEN 'offered'
	WHEN 'ghosted' THEN 'rejected'
	ELSE "from_status" END
WHERE "from_status" IS NOT NULL;--> statement-breakpoint
ALTER TABLE "applications" ALTER COLUMN "status" SET DATA TYPE "public"."application_status" USING "status"::"public"."application_status";--> statement-breakpoint
ALTER TABLE "applications" ALTER COLUMN "status" SET DEFAULT 'upcoming'::"public"."application_status";--> statement-breakpoint
ALTER TABLE "status_events" ALTER COLUMN "from_status" SET DATA TYPE "public"."application_status" USING "from_status"::"public"."application_status";--> statement-breakpoint
ALTER TABLE "status_events" ALTER COLUMN "to_status" SET DATA TYPE "public"."application_status" USING "to_status"::"public"."application_status";
