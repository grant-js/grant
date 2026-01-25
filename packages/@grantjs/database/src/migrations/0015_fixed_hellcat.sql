DROP INDEX "user_sessions_scope_tenant_scope_id_idx";--> statement-breakpoint
ALTER TABLE "user_sessions" ADD COLUMN "audience" varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE "user_sessions" DROP COLUMN "scope_tenant";--> statement-breakpoint
ALTER TABLE "user_sessions" DROP COLUMN "scope_id";