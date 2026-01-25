ALTER TABLE "project_user_api_keys" DROP CONSTRAINT IF EXISTS "project_user_api_keys_client_id_unique";--> statement-breakpoint
DROP INDEX IF EXISTS "project_user_api_keys_client_id_idx";--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "project_user_api_keys_client_id_unique" ON "project_user_api_keys" USING btree ("client_id");--> statement-breakpoint
DROP INDEX IF EXISTS "project_user_api_keys_deleted_at_idx";--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "project_user_api_keys_deleted_at_idx" ON "project_user_api_keys" USING btree ("deleted_at");