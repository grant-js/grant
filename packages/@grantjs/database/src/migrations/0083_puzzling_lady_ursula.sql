CREATE TABLE "project_oauth_connection_audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_oauth_connection_id" uuid,
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
CREATE TABLE "project_oauth_connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"provider" varchar(50) NOT NULL,
	"client_id" varchar(255) NOT NULL,
	"encrypted_secret" varchar(4000) NOT NULL,
	"secret_iv" varchar(255) NOT NULL,
	"secret_tag" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "project_oauth_connection_audit_logs" ADD CONSTRAINT "project_oauth_connection_audit_logs_project_oauth_connection_id_project_oauth_connections_id_fk" FOREIGN KEY ("project_oauth_connection_id") REFERENCES "public"."project_oauth_connections"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_oauth_connection_audit_logs" ADD CONSTRAINT "project_oauth_connection_audit_logs_performed_by_users_id_fk" FOREIGN KEY ("performed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_oauth_connections" ADD CONSTRAINT "project_oauth_connections_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "project_oauth_connection_audit_logs_connection_id_idx" ON "project_oauth_connection_audit_logs" USING btree ("project_oauth_connection_id");--> statement-breakpoint
CREATE INDEX "project_oauth_connection_audit_logs_action_idx" ON "project_oauth_connection_audit_logs" USING btree ("action");--> statement-breakpoint
CREATE INDEX "project_oauth_connection_audit_logs_scope_tenant_idx" ON "project_oauth_connection_audit_logs" USING btree ("scope_tenant");--> statement-breakpoint
CREATE UNIQUE INDEX "project_oauth_connections_project_id_provider_unique" ON "project_oauth_connections" USING btree ("project_id","provider") WHERE "project_oauth_connections"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "project_oauth_connections_project_id_idx" ON "project_oauth_connections" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "project_oauth_connections_deleted_at_idx" ON "project_oauth_connections" USING btree ("deleted_at");