CREATE TYPE "public"."application_status" AS ENUM('saved', 'applied', 'online_assessment', 'interview', 'offer', 'rejected', 'ghosted', 'withdrawn');--> statement-breakpoint
CREATE TYPE "public"."work_mode" AS ENUM('unknown', 'onsite', 'hybrid', 'remote');--> statement-breakpoint
CREATE TABLE "applications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"company" text NOT NULL,
	"role" text NOT NULL,
	"job_url" text,
	"location" text,
	"work_mode" "work_mode" DEFAULT 'unknown' NOT NULL,
	"term" text,
	"status" "application_status" DEFAULT 'saved' NOT NULL,
	"applied_at" date,
	"salary" text,
	"source" text,
	"notes" text,
	"external_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "status_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"from_status" "application_status",
	"to_status" "application_status" NOT NULL,
	"note" text,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "status_events" ADD CONSTRAINT "status_events_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "applications_user_idx" ON "applications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "applications_user_status_idx" ON "applications" USING btree ("user_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "applications_user_external_idx" ON "applications" USING btree ("user_id","external_id");--> statement-breakpoint
CREATE INDEX "status_events_application_idx" ON "status_events" USING btree ("application_id","occurred_at");