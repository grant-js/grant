CREATE TABLE "user_groups_audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_group_id" uuid,
	"action" varchar(50) NOT NULL,
	"old_values" varchar(1000),
	"new_values" varchar(1000),
	"metadata" varchar(1000),
	"performed_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"scope_tenant" varchar(50),
	"scope_id" varchar(255)
);
--> statement-breakpoint
CREATE TABLE "user_groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"group_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "project_user_group_audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_user_group_id" uuid,
	"action" varchar(50) NOT NULL,
	"old_values" varchar(1000),
	"new_values" varchar(1000),
	"metadata" varchar(1000),
	"performed_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"scope_tenant" varchar(50),
	"scope_id" varchar(255)
);
--> statement-breakpoint
CREATE TABLE "project_user_groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"group_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "project_user_groups" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "user_groups_audit_logs" ADD CONSTRAINT "user_groups_audit_logs_user_group_id_user_groups_id_fk" FOREIGN KEY ("user_group_id") REFERENCES "public"."user_groups"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_groups" ADD CONSTRAINT "user_groups_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_groups" ADD CONSTRAINT "user_groups_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_user_group_audit_logs" ADD CONSTRAINT "project_user_group_audit_logs_project_user_group_id_project_user_groups_id_fk" FOREIGN KEY ("project_user_group_id") REFERENCES "public"."project_user_groups"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_user_groups" ADD CONSTRAINT "project_user_groups_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_user_groups" ADD CONSTRAINT "project_user_groups_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_user_groups" ADD CONSTRAINT "project_user_groups_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "user_groups_audit_logs_user_group_id_idx" ON "user_groups_audit_logs" USING btree ("user_group_id");--> statement-breakpoint
CREATE INDEX "user_groups_audit_logs_action_idx" ON "user_groups_audit_logs" USING btree ("action");--> statement-breakpoint
CREATE INDEX "user_groups_audit_logs_scope_tenant_idx" ON "user_groups_audit_logs" USING btree ("scope_tenant");--> statement-breakpoint
CREATE UNIQUE INDEX "user_groups_user_id_group_id_unique" ON "user_groups" USING btree ("user_id","group_id") WHERE "user_groups"."deleted_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "user_groups_deleted_at_idx" ON "user_groups" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "project_user_group_audit_logs_project_user_group_id_idx" ON "project_user_group_audit_logs" USING btree ("project_user_group_id");--> statement-breakpoint
CREATE INDEX "project_user_group_audit_logs_action_idx" ON "project_user_group_audit_logs" USING btree ("action");--> statement-breakpoint
CREATE INDEX "project_user_group_audit_logs_scope_tenant_idx" ON "project_user_group_audit_logs" USING btree ("scope_tenant");--> statement-breakpoint
CREATE UNIQUE INDEX "project_user_groups_project_user_group_unique" ON "project_user_groups" USING btree ("project_id","user_id","group_id") WHERE "project_user_groups"."deleted_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "project_user_groups_deleted_at_idx" ON "project_user_groups" USING btree ("deleted_at");--> statement-breakpoint
CREATE POLICY "tenant_isolation_policy" ON "project_user_groups" AS RESTRICTIVE FOR SELECT TO public USING (NULLIF(current_setting('app.current_project_id', true), '') IS NULL OR project_id = NULLIF(current_setting('app.current_project_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "tenant_rls_allow" ON "project_user_groups" AS PERMISSIVE FOR ALL TO public USING (true) WITH CHECK (true);
