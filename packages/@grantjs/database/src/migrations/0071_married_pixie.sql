CREATE EXTENSION IF NOT EXISTS pg_trgm;--> statement-breakpoint
ALTER TABLE "groups" ADD COLUMN "search_document" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "project_users" ADD COLUMN "search_document" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "roles" ADD COLUMN "search_document" text DEFAULT '' NOT NULL;--> statement-breakpoint
CREATE INDEX "groups_search_document_trgm_idx" ON "groups" USING gin ("search_document" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "project_users_search_document_trgm_idx" ON "project_users" USING gin ("search_document" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "roles_search_document_trgm_idx" ON "roles" USING gin ("search_document" gin_trgm_ops);