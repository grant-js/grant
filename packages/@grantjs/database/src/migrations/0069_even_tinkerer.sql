CREATE TABLE "project_role_permission_audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_role_permission_id" uuid,
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
CREATE TABLE "project_role_permissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"role_id" uuid NOT NULL,
	"permission_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "project_role_permissions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "project_user_permission_audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_user_permission_id" uuid,
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
CREATE TABLE "project_user_permissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"permission_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "project_user_permissions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "role_permissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"role_id" uuid NOT NULL,
	"permission_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "role_permissions_audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"role_permission_id" uuid,
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
CREATE TABLE "user_permissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"permission_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "user_permissions_audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_permission_id" uuid,
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
ALTER TABLE "project_role_permission_audit_logs" ADD CONSTRAINT "project_role_permission_audit_logs_project_role_permission_id_project_role_permissions_id_fk" FOREIGN KEY ("project_role_permission_id") REFERENCES "public"."project_role_permissions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_role_permissions" ADD CONSTRAINT "project_role_permissions_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_role_permissions" ADD CONSTRAINT "project_role_permissions_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_role_permissions" ADD CONSTRAINT "project_role_permissions_permission_id_permissions_id_fk" FOREIGN KEY ("permission_id") REFERENCES "public"."permissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_user_permission_audit_logs" ADD CONSTRAINT "project_user_permission_audit_logs_project_user_permission_id_project_user_permissions_id_fk" FOREIGN KEY ("project_user_permission_id") REFERENCES "public"."project_user_permissions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_user_permissions" ADD CONSTRAINT "project_user_permissions_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_user_permissions" ADD CONSTRAINT "project_user_permissions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_user_permissions" ADD CONSTRAINT "project_user_permissions_permission_id_permissions_id_fk" FOREIGN KEY ("permission_id") REFERENCES "public"."permissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_permissions_id_fk" FOREIGN KEY ("permission_id") REFERENCES "public"."permissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions_audit_logs" ADD CONSTRAINT "role_permissions_audit_logs_role_permission_id_role_permissions_id_fk" FOREIGN KEY ("role_permission_id") REFERENCES "public"."role_permissions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_permissions" ADD CONSTRAINT "user_permissions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_permissions" ADD CONSTRAINT "user_permissions_permission_id_permissions_id_fk" FOREIGN KEY ("permission_id") REFERENCES "public"."permissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_permissions_audit_logs" ADD CONSTRAINT "user_permissions_audit_logs_user_permission_id_user_permissions_id_fk" FOREIGN KEY ("user_permission_id") REFERENCES "public"."user_permissions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "project_role_permission_audit_logs_project_role_permission_id_idx" ON "project_role_permission_audit_logs" USING btree ("project_role_permission_id");--> statement-breakpoint
CREATE INDEX "project_role_permission_audit_logs_action_idx" ON "project_role_permission_audit_logs" USING btree ("action");--> statement-breakpoint
CREATE INDEX "project_role_permission_audit_logs_scope_tenant_idx" ON "project_role_permission_audit_logs" USING btree ("scope_tenant");--> statement-breakpoint
CREATE UNIQUE INDEX "project_role_permissions_project_role_permission_unique" ON "project_role_permissions" USING btree ("project_id","role_id","permission_id") WHERE "project_role_permissions"."deleted_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "project_role_permissions_deleted_at_idx" ON "project_role_permissions" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "project_user_permission_audit_logs_project_user_permission_id_idx" ON "project_user_permission_audit_logs" USING btree ("project_user_permission_id");--> statement-breakpoint
CREATE INDEX "project_user_permission_audit_logs_action_idx" ON "project_user_permission_audit_logs" USING btree ("action");--> statement-breakpoint
CREATE INDEX "project_user_permission_audit_logs_scope_tenant_idx" ON "project_user_permission_audit_logs" USING btree ("scope_tenant");--> statement-breakpoint
CREATE UNIQUE INDEX "project_user_permissions_project_user_permission_unique" ON "project_user_permissions" USING btree ("project_id","user_id","permission_id") WHERE "project_user_permissions"."deleted_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "project_user_permissions_deleted_at_idx" ON "project_user_permissions" USING btree ("deleted_at");--> statement-breakpoint
CREATE UNIQUE INDEX "role_permissions_role_id_permission_id_unique" ON "role_permissions" USING btree ("role_id","permission_id") WHERE "role_permissions"."deleted_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "role_permissions_deleted_at_idx" ON "role_permissions" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "role_permissions_audit_logs_role_permission_id_idx" ON "role_permissions_audit_logs" USING btree ("role_permission_id");--> statement-breakpoint
CREATE INDEX "role_permissions_audit_logs_action_idx" ON "role_permissions_audit_logs" USING btree ("action");--> statement-breakpoint
CREATE INDEX "role_permissions_audit_logs_scope_tenant_idx" ON "role_permissions_audit_logs" USING btree ("scope_tenant");--> statement-breakpoint
CREATE UNIQUE INDEX "user_permissions_user_id_permission_id_unique" ON "user_permissions" USING btree ("user_id","permission_id") WHERE "user_permissions"."deleted_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "user_permissions_deleted_at_idx" ON "user_permissions" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "user_permissions_audit_logs_user_permission_id_idx" ON "user_permissions_audit_logs" USING btree ("user_permission_id");--> statement-breakpoint
CREATE INDEX "user_permissions_audit_logs_action_idx" ON "user_permissions_audit_logs" USING btree ("action");--> statement-breakpoint
CREATE INDEX "user_permissions_audit_logs_scope_tenant_idx" ON "user_permissions_audit_logs" USING btree ("scope_tenant");--> statement-breakpoint
CREATE POLICY "tenant_isolation_policy" ON "project_role_permissions" AS RESTRICTIVE FOR SELECT TO public USING (NULLIF(current_setting('app.current_project_id', true), '') IS NULL OR project_id = NULLIF(current_setting('app.current_project_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "tenant_rls_allow" ON "project_role_permissions" AS PERMISSIVE FOR ALL TO public USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "tenant_isolation_policy" ON "project_user_permissions" AS RESTRICTIVE FOR SELECT TO public USING (NULLIF(current_setting('app.current_project_id', true), '') IS NULL OR project_id = NULLIF(current_setting('app.current_project_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "tenant_rls_allow" ON "project_user_permissions" AS PERMISSIVE FOR ALL TO public USING (true) WITH CHECK (true);