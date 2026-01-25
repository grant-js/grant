DROP INDEX "role_audit_logs_created_at_idx";--> statement-breakpoint
DROP INDEX "roles_created_at_idx";--> statement-breakpoint
DROP INDEX "users_email_unique_idx";--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_unique_idx" ON "users" USING btree ("email") WHERE "users"."deleted_at" IS NULL;