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
CREATE TABLE "project_user_api_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"client_id" varchar(255) NOT NULL,
	"client_secret_hash" varchar(255) NOT NULL,
	"name" varchar(255),
	"description" varchar(1000),
	"expires_at" timestamp,
	"last_used_at" timestamp,
	"is_revoked" boolean DEFAULT false NOT NULL,
	"revoked_at" timestamp,
	"revoked_by" uuid,
	"created_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "project_user_api_key_audit_logs" ADD CONSTRAINT "project_user_api_key_audit_logs_project_user_api_key_id_project_user_api_keys_id_fk" FOREIGN KEY ("project_user_api_key_id") REFERENCES "public"."project_user_api_keys"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_user_api_key_audit_logs" ADD CONSTRAINT "project_user_api_key_audit_logs_performed_by_users_id_fk" FOREIGN KEY ("performed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_user_api_keys" ADD CONSTRAINT "project_user_api_keys_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_user_api_keys" ADD CONSTRAINT "project_user_api_keys_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_user_api_keys" ADD CONSTRAINT "project_user_api_keys_revoked_by_users_id_fk" FOREIGN KEY ("revoked_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_user_api_keys" ADD CONSTRAINT "project_user_api_keys_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "project_user_api_key_audit_logs_key_id_idx" ON "project_user_api_key_audit_logs" USING btree ("project_user_api_key_id");--> statement-breakpoint
CREATE INDEX "project_user_api_key_audit_logs_action_idx" ON "project_user_api_key_audit_logs" USING btree ("action");--> statement-breakpoint
CREATE UNIQUE INDEX "project_user_api_keys_client_id_unique" ON "project_user_api_keys" USING btree ("client_id");--> statement-breakpoint
CREATE UNIQUE INDEX "project_user_api_keys_project_user_unique" ON "project_user_api_keys" USING btree ("project_id","user_id") WHERE "project_user_api_keys"."deleted_at" IS NULL AND "project_user_api_keys"."is_revoked" = false;--> statement-breakpoint
CREATE UNIQUE INDEX "project_user_api_keys_deleted_at_idx" ON "project_user_api_keys" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "project_user_api_keys_project_id_idx" ON "project_user_api_keys" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "project_user_api_keys_user_id_idx" ON "project_user_api_keys" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "project_user_api_keys_is_revoked_idx" ON "project_user_api_keys" USING btree ("is_revoked");