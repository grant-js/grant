CREATE TABLE "project_user_credential_audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_user_credential_id" uuid,
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
CREATE TABLE "project_user_credential_lockouts" (
	"project_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"failed_attempts" integer DEFAULT 0 NOT NULL,
	"window_started_at" timestamp NOT NULL,
	"locked_until" timestamp,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "project_user_credential_lockouts_pk" PRIMARY KEY("project_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "project_user_credential_lockouts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "project_user_credentials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"hash" varchar(255) NOT NULL,
	"source" varchar(30) NOT NULL,
	"last_used_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	CONSTRAINT "project_user_credentials_source_check" CHECK (("source" IN ('register', 'cdm-import', 'reset', 'change', 'migrated', 'migrated-import')))
);
--> statement-breakpoint
ALTER TABLE "project_user_credentials" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "user_credential_audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_credential_id" uuid,
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
CREATE TABLE "user_credential_lockouts" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"failed_attempts" integer DEFAULT 0 NOT NULL,
	"window_started_at" timestamp NOT NULL,
	"locked_until" timestamp,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_credentials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"hash" varchar(255) NOT NULL,
	"source" varchar(30) NOT NULL,
	"last_used_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	CONSTRAINT "user_credentials_source_check" CHECK (("source" IN ('register', 'cdm-import', 'reset', 'change', 'migrated', 'migrated-import')))
);
--> statement-breakpoint
ALTER TABLE "project_user_credential_audit_logs" ADD CONSTRAINT "project_user_credential_audit_logs_project_user_credential_id_project_user_credentials_id_fk" FOREIGN KEY ("project_user_credential_id") REFERENCES "public"."project_user_credentials"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_user_credential_audit_logs" ADD CONSTRAINT "project_user_credential_audit_logs_performed_by_users_id_fk" FOREIGN KEY ("performed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_user_credential_lockouts" ADD CONSTRAINT "project_user_credential_lockouts_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_user_credential_lockouts" ADD CONSTRAINT "project_user_credential_lockouts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_user_credentials" ADD CONSTRAINT "project_user_credentials_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_user_credentials" ADD CONSTRAINT "project_user_credentials_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_credential_audit_logs" ADD CONSTRAINT "user_credential_audit_logs_user_credential_id_user_credentials_id_fk" FOREIGN KEY ("user_credential_id") REFERENCES "public"."user_credentials"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_credential_audit_logs" ADD CONSTRAINT "user_credential_audit_logs_performed_by_users_id_fk" FOREIGN KEY ("performed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_credential_lockouts" ADD CONSTRAINT "user_credential_lockouts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_credentials" ADD CONSTRAINT "user_credentials_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "project_user_credential_audit_logs_credential_id_idx" ON "project_user_credential_audit_logs" USING btree ("project_user_credential_id");--> statement-breakpoint
CREATE INDEX "project_user_credential_audit_logs_action_idx" ON "project_user_credential_audit_logs" USING btree ("action");--> statement-breakpoint
CREATE INDEX "project_user_credential_audit_logs_scope_tenant_idx" ON "project_user_credential_audit_logs" USING btree ("scope_tenant");--> statement-breakpoint
CREATE INDEX "project_user_credential_lockouts_user_id_idx" ON "project_user_credential_lockouts" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "project_user_credentials_project_id_user_id_unique" ON "project_user_credentials" USING btree ("project_id","user_id") WHERE "project_user_credentials"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "project_user_credentials_project_id_idx" ON "project_user_credentials" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "project_user_credentials_user_id_idx" ON "project_user_credentials" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "project_user_credentials_deleted_at_idx" ON "project_user_credentials" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "user_credential_audit_logs_user_credential_id_idx" ON "user_credential_audit_logs" USING btree ("user_credential_id");--> statement-breakpoint
CREATE INDEX "user_credential_audit_logs_action_idx" ON "user_credential_audit_logs" USING btree ("action");--> statement-breakpoint
CREATE INDEX "user_credential_audit_logs_scope_tenant_idx" ON "user_credential_audit_logs" USING btree ("scope_tenant");--> statement-breakpoint
CREATE UNIQUE INDEX "user_credentials_user_id_unique" ON "user_credentials" USING btree ("user_id") WHERE "user_credentials"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "user_credentials_user_id_idx" ON "user_credentials" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_credentials_deleted_at_idx" ON "user_credentials" USING btree ("deleted_at");--> statement-breakpoint
CREATE POLICY "tenant_isolation_policy" ON "project_user_credential_lockouts" AS RESTRICTIVE FOR SELECT TO public USING (NULLIF(current_setting('app.current_project_id', true), '') IS NULL OR project_id = NULLIF(current_setting('app.current_project_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "tenant_rls_allow" ON "project_user_credential_lockouts" AS PERMISSIVE FOR ALL TO public USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "tenant_isolation_policy" ON "project_user_credentials" AS RESTRICTIVE FOR SELECT TO public USING (NULLIF(current_setting('app.current_project_id', true), '') IS NULL OR project_id = NULLIF(current_setting('app.current_project_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "tenant_rls_allow" ON "project_user_credentials" AS PERMISSIVE FOR ALL TO public USING (true) WITH CHECK (true);