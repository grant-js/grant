ALTER TABLE "project_sync_jobs" ALTER COLUMN "payload" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "project_sync_jobs" ADD COLUMN "payload_path" text;--> statement-breakpoint
ALTER TABLE "project_sync_jobs" ADD COLUMN "payload_size_bytes" integer;--> statement-breakpoint
ALTER TABLE "project_sync_jobs" ADD COLUMN "entity_count_hint" integer;--> statement-breakpoint
CREATE UNIQUE INDEX "project_sync_jobs_payload_path_unique" ON "project_sync_jobs" USING btree ("payload_path") WHERE "project_sync_jobs"."payload_path" IS NOT NULL;--> statement-breakpoint
ALTER TABLE "project_sync_jobs" ADD CONSTRAINT "project_sync_jobs_payload_present_check" CHECK (("payload" IS NOT NULL OR "payload_path" IS NOT NULL));