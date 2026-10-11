CREATE TABLE "project_oauth_grant_audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_oauth_grant_id" uuid,
	"action" varchar(50) NOT NULL,
	"old_values" varchar(1000),
	"new_values" varchar(1000),
	"metadata" varchar(1000),
	"performed_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"scope_tenant" varchar(50),
	"scope_id" varchar(255)
);
--> statement-breakpoint
CREATE TABLE "project_oauth_grants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_app_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"scope_tenant" varchar(50) NOT NULL,
	"scope_id" varchar(255) NOT NULL,
	"scopes" jsonb,
	"token" varchar(255) NOT NULL,
	"expires_at" timestamp NOT NULL,
	"last_used_at" timestamp,
	"user_agent" varchar(500),
	"ip_address" varchar(45),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	CONSTRAINT "project_oauth_grants_token_unique" UNIQUE("token")
);
--> statement-breakpoint
ALTER TABLE "project_oauth_grant_audit_logs" ADD CONSTRAINT "project_oauth_grant_audit_logs_project_oauth_grant_id_project_oauth_grants_id_fk" FOREIGN KEY ("project_oauth_grant_id") REFERENCES "public"."project_oauth_grants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_oauth_grant_audit_logs" ADD CONSTRAINT "project_oauth_grant_audit_logs_performed_by_users_id_fk" FOREIGN KEY ("performed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_oauth_grants" ADD CONSTRAINT "project_oauth_grants_project_app_id_project_apps_id_fk" FOREIGN KEY ("project_app_id") REFERENCES "public"."project_apps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_oauth_grants" ADD CONSTRAINT "project_oauth_grants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "project_oauth_grant_audit_logs_grant_id_idx" ON "project_oauth_grant_audit_logs" USING btree ("project_oauth_grant_id");--> statement-breakpoint
CREATE INDEX "project_oauth_grant_audit_logs_action_idx" ON "project_oauth_grant_audit_logs" USING btree ("action");--> statement-breakpoint
CREATE INDEX "project_oauth_grant_audit_logs_scope_tenant_idx" ON "project_oauth_grant_audit_logs" USING btree ("scope_tenant");--> statement-breakpoint
CREATE INDEX "project_oauth_grants_token_idx" ON "project_oauth_grants" USING btree ("token");--> statement-breakpoint
CREATE INDEX "project_oauth_grants_project_app_id_idx" ON "project_oauth_grants" USING btree ("project_app_id");--> statement-breakpoint
CREATE INDEX "project_oauth_grants_user_id_idx" ON "project_oauth_grants" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "project_oauth_grants_expires_at_idx" ON "project_oauth_grants" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "project_oauth_grants_deleted_at_idx" ON "project_oauth_grants" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "project_oauth_grants_project_app_user_idx" ON "project_oauth_grants" USING btree ("project_app_id","user_id");--> statement-breakpoint
CREATE INDEX "project_oauth_grants_scope_tenant_scope_id_idx" ON "project_oauth_grants" USING btree ("scope_tenant","scope_id");