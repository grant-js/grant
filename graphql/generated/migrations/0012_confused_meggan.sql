CREATE TABLE "account_projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "account_project_audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_project_id" uuid NOT NULL,
	"action" varchar(50) NOT NULL,
	"old_values" varchar(1000),
	"new_values" varchar(1000),
	"metadata" varchar(1000),
	"performed_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "account_audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"action" varchar(50) NOT NULL,
	"old_values" varchar(1000),
	"new_values" varchar(1000),
	"metadata" varchar(1000),
	"performed_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"type" varchar(20) DEFAULT 'personal' NOT NULL,
	"owner_id" uuid NOT NULL,
	"deleted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "accounts_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "user_authentication_methods" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"provider" varchar(50) NOT NULL,
	"provider_id" varchar(255) NOT NULL,
	"provider_data" jsonb,
	"is_verified" boolean DEFAULT false NOT NULL,
	"verified_at" timestamp,
	"is_primary" boolean DEFAULT false NOT NULL,
	"last_used_at" timestamp,
	"deleted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_authentication_method_audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_authentication_method_id" uuid NOT NULL,
	"action" varchar(50) NOT NULL,
	"old_values" varchar(1000),
	"new_values" varchar(1000),
	"metadata" varchar(1000),
	"performed_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"auth_method_id" uuid NOT NULL,
	"token" varchar(255) NOT NULL,
	"scope" varchar(50) NOT NULL,
	"scope_id" uuid NOT NULL,
	"expires_at" timestamp NOT NULL,
	"last_used_at" timestamp,
	"user_agent" varchar(500),
	"ip_address" varchar(45),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	CONSTRAINT "user_sessions_token_unique" UNIQUE("token")
);
--> statement-breakpoint
ALTER TABLE "account_projects" ADD CONSTRAINT "account_projects_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account_projects" ADD CONSTRAINT "account_projects_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account_project_audit_logs" ADD CONSTRAINT "account_project_audit_logs_account_project_id_account_projects_id_fk" FOREIGN KEY ("account_project_id") REFERENCES "public"."account_projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account_audit_logs" ADD CONSTRAINT "account_audit_logs_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_authentication_methods" ADD CONSTRAINT "user_authentication_methods_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_authentication_method_audit_logs" ADD CONSTRAINT "user_authentication_method_audit_logs_user_authentication_method_id_user_authentication_methods_id_fk" FOREIGN KEY ("user_authentication_method_id") REFERENCES "public"."user_authentication_methods"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_auth_method_id_user_authentication_methods_id_fk" FOREIGN KEY ("auth_method_id") REFERENCES "public"."user_authentication_methods"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "account_projects_account_id_project_id_unique" ON "account_projects" USING btree ("account_id","project_id") WHERE "account_projects"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "account_projects_deleted_at_idx" ON "account_projects" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "account_project_audit_logs_account_project_id_idx" ON "account_project_audit_logs" USING btree ("account_project_id");--> statement-breakpoint
CREATE INDEX "account_project_audit_logs_action_idx" ON "account_project_audit_logs" USING btree ("action");--> statement-breakpoint
CREATE INDEX "account_audit_logs_account_id_idx" ON "account_audit_logs" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "account_audit_logs_action_idx" ON "account_audit_logs" USING btree ("action");--> statement-breakpoint
CREATE INDEX "accounts_owner_id_idx" ON "accounts" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "accounts_slug_idx" ON "accounts" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "accounts_type_idx" ON "accounts" USING btree ("type");--> statement-breakpoint
CREATE INDEX "accounts_deleted_at_idx" ON "accounts" USING btree ("deleted_at");--> statement-breakpoint
CREATE UNIQUE INDEX "user_auth_methods_provider_provider_id_unique" ON "user_authentication_methods" USING btree ("provider","provider_id") WHERE "user_authentication_methods"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "user_auth_methods_user_id_idx" ON "user_authentication_methods" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_auth_methods_provider_idx" ON "user_authentication_methods" USING btree ("provider");--> statement-breakpoint
CREATE INDEX "user_auth_methods_deleted_at_idx" ON "user_authentication_methods" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "user_auth_methods_provider_data_idx" ON "user_authentication_methods" USING gin ("provider_data");--> statement-breakpoint
CREATE INDEX "user_auth_method_audit_logs_user_auth_method_id_idx" ON "user_authentication_method_audit_logs" USING btree ("user_authentication_method_id");--> statement-breakpoint
CREATE INDEX "user_auth_method_audit_logs_action_idx" ON "user_authentication_method_audit_logs" USING btree ("action");--> statement-breakpoint
CREATE INDEX "user_sessions_token_idx" ON "user_sessions" USING btree ("token");--> statement-breakpoint
CREATE INDEX "user_sessions_user_id_idx" ON "user_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_sessions_scope_scope_id_idx" ON "user_sessions" USING btree ("scope","scope_id");--> statement-breakpoint
CREATE INDEX "user_sessions_expires_at_idx" ON "user_sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "user_sessions_auth_method_id_idx" ON "user_sessions" USING btree ("auth_method_id");--> statement-breakpoint
CREATE INDEX "user_sessions_deleted_at_idx" ON "user_sessions" USING btree ("deleted_at");--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "email";