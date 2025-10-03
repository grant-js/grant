ALTER TABLE "user_sessions" DROP CONSTRAINT "user_sessions_auth_method_id_user_authentication_methods_id_fk";
--> statement-breakpoint
DROP INDEX "user_sessions_scope_scope_id_idx";--> statement-breakpoint
DROP INDEX "user_sessions_auth_method_id_idx";--> statement-breakpoint
ALTER TABLE "user_sessions" ADD COLUMN "user_authentication_method_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "user_sessions" ADD COLUMN "scope_tenant" varchar(50) NOT NULL;--> statement-breakpoint
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_user_authentication_method_id_user_authentication_methods_id_fk" FOREIGN KEY ("user_authentication_method_id") REFERENCES "public"."user_authentication_methods"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "user_sessions_scope_tenant_scope_id_idx" ON "user_sessions" USING btree ("scope_tenant","scope_id");--> statement-breakpoint
CREATE INDEX "user_sessions_user_authentication_method_id_idx" ON "user_sessions" USING btree ("user_authentication_method_id");--> statement-breakpoint
ALTER TABLE "user_sessions" DROP COLUMN "auth_method_id";--> statement-breakpoint
ALTER TABLE "user_sessions" DROP COLUMN "scope";