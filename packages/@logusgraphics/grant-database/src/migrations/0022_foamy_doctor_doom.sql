CREATE TABLE "project_user_api_key_audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_user_api_key_id" uuid NOT NULL,
	"action" varchar(50) NOT NULL,
	"old_values" varchar(1000),
	"new_values" varchar(1000),
	"metadata" varchar(1000),
	"performed_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "project_user_api_key_audit_logs" ADD CONSTRAINT "project_user_api_key_audit_logs_project_user_api_key_id_project_user_api_keys_id_fk" FOREIGN KEY ("project_user_api_key_id") REFERENCES "public"."project_user_api_keys"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_user_api_key_audit_logs" ADD CONSTRAINT "project_user_api_key_audit_logs_performed_by_users_id_fk" FOREIGN KEY ("performed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "project_user_api_key_audit_logs_project_user_api_key_id_idx" ON "project_user_api_key_audit_logs" USING btree ("project_user_api_key_id");--> statement-breakpoint
CREATE INDEX "project_user_api_key_audit_logs_action_idx" ON "project_user_api_key_audit_logs" USING btree ("action");